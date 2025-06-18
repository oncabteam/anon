package io.vibemesh.sdk

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.Button
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.fragment.app.FragmentManager
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

/**
 * VibeMesh Android Native SDK
 * Automatic event tracking for Android apps with privacy-first design
 * @version 1.0.0
 */
class VibeMesh private constructor() {
    
    companion object {
        @JvmStatic
        val instance: VibeMesh by lazy { VibeMesh() }
        
        private const val TAG = "VibeMesh"
        private const val PREFS_NAME = "VibeMesh_prefs"
        private const val USER_ID_KEY = "user_id"
        private const val PENDING_EVENTS_KEY = "pending_events"
        private const val LAST_SYNC_KEY = "last_sync"
        private const val SESSION_ID_KEY = "session_id"
        private const val OPT_OUT_KEY = "opt_out"
        
        private const val DEFAULT_ENDPOINT = "https://api.vibemesh.io/events"
        private const val DEFAULT_BATCH_SIZE = 50
        private const val DEFAULT_FLUSH_INTERVAL = 30L * 1000L // 30 seconds
    }
    
    data class Configuration(
        val apiKey: String,
        val endpoint: String = DEFAULT_ENDPOINT,
        val enableGeolocation: Boolean = false,
        val enableAutoTracking: Boolean = true,
        val debugMode: Boolean = false,
        val batchSize: Int = DEFAULT_BATCH_SIZE,
        val flushInterval: Long = DEFAULT_FLUSH_INTERVAL
    )
    
    @Serializable
    data class VibeMeshEvent(
        val event_id: String,
        val event_type: String,
        val entity_id: String? = null,
        val timestamp: String,
        val uuid: String,
        val session_id: String,
        val client_id: String,
        val platform: String = "android",
        val context: Map<String, String>,
        val geo_context: Map<String, String>? = null,
        val tags: List<String> = emptyList(),
        val ttl: Int
    )
    
    // Properties
    private var context: Context? = null
    private var config: Configuration? = null
    private var isInitialized = false
    private var userId: String? = null
    private var sessionId: String? = null
    private var pendingEvents = mutableListOf<VibeMeshEvent>()
    private var flushHandler: Handler? = null
    private var flushRunnable: Runnable? = null
    private var locationManager: LocationManager? = null
    private var currentLocation: Location? = null
    private var isOptedOut = false
    private var prefs: SharedPreferences? = null
    private var httpClient: OkHttpClient? = null
    private var scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    // Auto-tracking state
    private var autoTrackingEnabled = false
    private var activityCallbacks: Application.ActivityLifecycleCallbacks? = null
    private var fragmentCallbacks: FragmentManager.FragmentLifecycleCallbacks? = null
    
    // Initialization
    suspend fun initialize(context: Context, config: Configuration) {
        if (isInitialized) {
            log("VibeMesh already initialized")
            return
        }
        
        this.context = context.applicationContext
        this.config = config
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // Check opt-out status
        isOptedOut = prefs?.getBoolean(OPT_OUT_KEY, false) ?: false
        if (isOptedOut) {
            log("User has opted out, SDK will not track events")
            return
        }
        
        // Initialize HTTP client
        httpClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
        
        // Get or create user ID
        userId = getOrCreateUserId()
        
        // Create new session
        sessionId = UUID.randomUUID().toString()
        prefs?.edit()?.putString(SESSION_ID_KEY, sessionId)?.apply()
        
        // Load pending events
        loadPendingEvents()
        
        // Setup location if enabled
        if (config.enableGeolocation) {
            setupLocationManager()
        }
        
        // Setup auto-tracking if enabled
        if (config.enableAutoTracking) {
            setupAutoTracking()
        }
        
        // Setup app lifecycle observers
        setupAppLifecycleObservers()
        
        // Start flush timer
        startFlushTimer()
        
        isInitialized = true
        
        // Track session start
        track("session_start", mapOf(
            "session_id" to (sessionId ?: ""),
            "platform" to "android",
            "app_version" to getAppVersion(),
            "os_version" to android.os.Build.VERSION.RELEASE
        ))
        
        // Initial flush
        flush()
        
        log("VibeMesh Android SDK initialized successfully")
    }
    
    // Event Tracking
    suspend fun track(
        eventType: String,
        context: Map<String, String> = emptyMap(),
        geoContext: Map<String, String>? = null
    ) {
        if (!isInitialized || isOptedOut) {
            log("SDK not initialized or user opted out")
            return
        }
        
        val finalGeoContext = geoContext ?: if (config?.enableGeolocation == true) {
            getCurrentGeoContext()
        } else null
        
        val event = VibeMeshEvent(
            event_id = UUID.randomUUID().toString(),
            event_type = eventType,
            entity_id = context["entity_id"],
            timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date()),
            uuid = userId ?: "",
            session_id = sessionId ?: "",
            client_id = config?.apiKey ?: "",
            platform = "android",
            context = context,
            geo_context = finalGeoContext,
            tags = context["tags"]?.split(",") ?: emptyList(),
            ttl = getTTLForEventType(eventType)
        )
        
        synchronized(pendingEvents) {
            pendingEvents.add(event)
        }
        savePendingEvents()
        
        log("Event tracked: $eventType")
        
        // Trigger flush if batch size reached
        if (pendingEvents.size >= (config?.batchSize ?: DEFAULT_BATCH_SIZE)) {
            flush()
        }
    }
    
    // High-Level Tracking Methods
    suspend fun trackScreenView(screenName: String, screenClass: String? = null) {
        track("screen_view", mapOf(
            "screen_name" to screenName,
            "screen_class" to (screenClass ?: "Unknown")
        ))
    }
    
    suspend fun trackButtonTap(buttonText: String, screenName: String? = null) {
        track("button_tap", mapOf(
            "button_text" to buttonText,
            "screen_name" to (screenName ?: getCurrentScreenName())
        ))
    }
    
    suspend fun trackSearch(query: String, resultCount: Int = 0, filters: Map<String, String> = emptyMap()) {
        val context = mutableMapOf(
            "search_query" to query,
            "result_count" to resultCount.toString()
        )
        context.putAll(filters)
        track("search", context)
    }
    
    suspend fun trackPurchase(
        transactionId: String,
        amount: Double,
        currency: String,
        items: List<Map<String, String>> = emptyList()
    ) {
        track("purchase", mapOf(
            "transaction_id" to transactionId,
            "amount" to amount.toString(),
            "currency" to currency,
            "item_count" to items.size.toString()
        ))
    }
    
    suspend fun trackContentView(contentId: String, contentType: String, contentName: String? = null) {
        track("content_view", mapOf(
            "content_id" to contentId,
            "content_type" to contentType,
            "content_name" to (contentName ?: "")
        ))
    }
    
    // Auto-Tracking Setup
    private fun setupAutoTracking() {
        if (autoTrackingEnabled) return
        
        autoTrackingEnabled = true
        
        // Setup activity lifecycle callbacks for screen tracking
        setupActivityCallbacks()
        
        // Setup fragment callbacks if available
        setupFragmentCallbacks()
        
        log("Auto-tracking enabled")
    }
    
    private fun setupActivityCallbacks() {
        val app = context as? Application ?: return
        
        activityCallbacks = object : Application.ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            
            override fun onActivityResumed(activity: Activity) {
                scope.launch {
                    trackScreenView(
                        activity.javaClass.simpleName,
                        activity.javaClass.name
                    )
                }
                setupClickListener(activity)
            }
            
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        }
        
        app.registerActivityLifecycleCallbacks(activityCallbacks)
    }
    
    private fun setupFragmentCallbacks() {
        // Fragment callbacks would be set up per FragmentActivity
        // This is a simplified version - in practice you'd hook into FragmentManager
    }
    
    private fun setupClickListener(activity: Activity) {
        // This is a simplified approach - in practice you'd use a more sophisticated
        // view hierarchy traversal or accessibility service
        val rootView = activity.findViewById<View>(android.R.id.content)
        rootView?.let { setupViewClickListener(it) }
    }
    
    private fun setupViewClickListener(view: View) {
        if (view is Button) {
            view.setOnClickListener { button ->
                scope.launch {
                    trackButtonTap((button as Button).text.toString())
                }
            }
        }
        
        // Recursively set up click listeners for child views
        if (view is android.view.ViewGroup) {
            for (i in 0 until view.childCount) {
                setupViewClickListener(view.getChildAt(i))
            }
        }
    }
    
    // Location Management
    private fun setupLocationManager() {
        try {
            locationManager = context?.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            
            // Request location updates (simplified - in practice you'd check permissions first)
            locationManager?.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                300000L, // 5 minutes
                100f,    // 100 meters
                object : LocationListener {
                    override fun onLocationChanged(location: Location) {
                        currentLocation = location
                    }
                    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                    override fun onProviderEnabled(provider: String) {}
                    override fun onProviderDisabled(provider: String) {}
                }
            )
        } catch (e: SecurityException) {
            log("Location permission not granted")
        }
    }
    
    private fun getCurrentGeoContext(): Map<String, String>? {
        val location = currentLocation ?: return null
        
        return mapOf(
            "latitude" to location.latitude.toString(),
            "longitude" to location.longitude.toString(),
            "accuracy" to location.accuracy.toString(),
            "timestamp" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date(location.time))
        )
    }
    
    // App Lifecycle
    private fun setupAppLifecycleObservers() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : LifecycleEventObserver {
            override fun onStateChanged(source: LifecycleOwner, event: Lifecycle.Event) {
                when (event) {
                    Lifecycle.Event.ON_START -> {
                        scope.launch {
                            track("app_foreground", mapOf("session_id" to (sessionId ?: "")))
                            flush()
                        }
                    }
                    Lifecycle.Event.ON_STOP -> {
                        scope.launch {
                            track("app_background", mapOf("session_id" to (sessionId ?: "")))
                            flush()
                        }
                    }
                    else -> {}
                }
            }
        })
    }
    
    // Sync and Storage
    fun flush() {
        if (pendingEvents.isEmpty()) return
        
        val eventsToSend = synchronized(pendingEvents) {
            pendingEvents.take(config?.batchSize ?: DEFAULT_BATCH_SIZE).toList()
        }
        
        scope.launch {
            try {
                val success = sendEvents(eventsToSend)
                if (success) {
                    synchronized(pendingEvents) {
                        repeat(eventsToSend.size) {
                            if (pendingEvents.isNotEmpty()) {
                                pendingEvents.removeAt(0)
                            }
                        }
                    }
                    savePendingEvents()
                    
                    // Update last sync time
                    prefs?.edit()?.putLong(LAST_SYNC_KEY, System.currentTimeMillis())?.apply()
                    
                    log("Successfully sent ${eventsToSend.size} events")
                    
                    // Continue flushing if more events
                    if (pendingEvents.isNotEmpty()) {
                        delay(100)
                        flush()
                    }
                }
            } catch (e: Exception) {
                log("Error flushing events: ${e.message}")
            }
        }
    }
    
    private suspend fun sendEvents(events: List<VibeMeshEvent>): Boolean {
        val config = this.config ?: return false
        val client = httpClient ?: return false
        
        val payload = mapOf(
            "client_id" to config.apiKey,
            "events" to events
        )
        
        val json = Json.encodeToString(payload)
        val body = json.toRequestBody("application/json".toMediaType())
        
        val request = Request.Builder()
            .url(config.endpoint)
            .post(body)
            .header("User-Agent", "VibeMesh-Android/1.0.0")
            .build()
        
        return withContext(Dispatchers.IO) {
            try {
                val response = client.newCall(request).execute()
                response.isSuccessful
            } catch (e: IOException) {
                false
            }
        }
    }
    
    // Privacy Controls
    suspend fun optOut() {
        isOptedOut = true
        prefs?.edit()?.putBoolean(OPT_OUT_KEY, true)?.apply()
        
        // Clear pending events
        synchronized(pendingEvents) {
            pendingEvents.clear()
        }
        savePendingEvents()
        
        // Stop timer
        stopFlushTimer()
        
        log("User opted out of tracking")
    }
    
    suspend fun optIn() {
        isOptedOut = false
        prefs?.edit()?.putBoolean(OPT_OUT_KEY, false)?.apply()
        
        if (isInitialized) {
            startFlushTimer()
        }
        
        log("User opted back into tracking")
    }
    
    fun isOptedOutStatus(): Boolean = isOptedOut
    
    // Utility Methods
    fun getPendingEventsCount(): Int = pendingEvents.size
    
    fun getUserId(): String? = userId
    
    fun getSessionId(): String? = sessionId
    
    // Private Methods
    private fun getOrCreateUserId(): String {
        val existingUserId = prefs?.getString(USER_ID_KEY, null)
        if (existingUserId != null) {
            return existingUserId
        }
        
        val newUserId = "anon-${UUID.randomUUID()}"
        prefs?.edit()?.putString(USER_ID_KEY, newUserId)?.apply()
        return newUserId
    }
    
    private fun loadPendingEvents() {
        try {
            val eventsJson = prefs?.getString(PENDING_EVENTS_KEY, null)
            if (eventsJson != null) {
                val events = Json.decodeFromString<List<VibeMeshEvent>>(eventsJson)
                synchronized(pendingEvents) {
                    pendingEvents.clear()
                    pendingEvents.addAll(events)
                }
            }
        } catch (e: Exception) {
            log("Error loading pending events: ${e.message}")
            synchronized(pendingEvents) {
                pendingEvents.clear()
            }
        }
    }
    
    private fun savePendingEvents() {
        try {
            val eventsJson = Json.encodeToString(pendingEvents.toList())
            prefs?.edit()?.putString(PENDING_EVENTS_KEY, eventsJson)?.apply()
        } catch (e: Exception) {
            log("Error saving pending events: ${e.message}")
        }
    }
    
    private fun startFlushTimer() {
        stopFlushTimer()
        flushHandler = Handler(Looper.getMainLooper())
        flushRunnable = object : Runnable {
            override fun run() {
                flush()
                flushHandler?.postDelayed(this, config?.flushInterval ?: DEFAULT_FLUSH_INTERVAL)
            }
        }
        flushHandler?.postDelayed(flushRunnable!!, config?.flushInterval ?: DEFAULT_FLUSH_INTERVAL)
    }
    
    private fun stopFlushTimer() {
        flushRunnable?.let { flushHandler?.removeCallbacks(it) }
        flushRunnable = null
        flushHandler = null
    }
    
    private fun getTTLForEventType(eventType: String): Int {
        return when (eventType) {
            "screen_view", "button_tap" -> 180 * 24 * 60 * 60 // 180 days
            "purchase" -> 365 * 24 * 60 * 60 // 365 days
            "search" -> 90 * 24 * 60 * 60 // 90 days
            "app_foreground", "app_background" -> 30 * 24 * 60 * 60 // 30 days
            else -> 90 * 24 * 60 * 60 // 90 days default
        }
    }
    
    private fun getCurrentScreenName(): String {
        // This would be more sophisticated in practice, tracking current activity
        return "Unknown"
    }
    
    private fun getAppVersion(): String {
        return try {
            context?.packageManager?.getPackageInfo(context!!.packageName, 0)?.versionName ?: "unknown"
        } catch (e: Exception) {
            "unknown"
        }
    }
    
    private fun log(message: String) {
        if (config?.debugMode == true) {
            Log.d(TAG, message)
        }
    }
    
    // Cleanup
    fun cleanup() {
        stopFlushTimer()
        activityCallbacks?.let { 
            (context as? Application)?.unregisterActivityLifecycleCallbacks(it)
        }
        scope.cancel()
        log("VibeMesh SDK cleaned up")
    }
}