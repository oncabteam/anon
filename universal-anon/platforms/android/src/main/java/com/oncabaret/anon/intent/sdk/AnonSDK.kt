/**
 * OnCabaret Anonymous Intent Graph SDK for Android
 * Privacy-first analytics platform for behavioral signals
 */

package com.oncabaret.anon.intent.sdk

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.location.Location
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.DisplayMetrics
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.google.android.gms.location.*
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.util.*
import java.util.concurrent.TimeUnit

// MARK: - Event Types

enum class IntentEventType(val value: String) {
    // Behavioral Signals
    TAP_TO_SAVE("tap_to_save"),
    HOVER("hover"),
    SWIPE_LEFT("swipe_left"),
    SWIPE_RIGHT("swipe_right"),
    SCROLL_DEPTH("scroll_depth"),
    ZOOM_IN("zoom_in"),
    ZOOM_OUT("zoom_out"),
    LONG_PRESS("long_press"),
    
    // Navigation & Discovery
    PAGE_VIEW("page_view"),
    SEARCH("search"),
    FILTER_APPLY("filter_apply"),
    CATEGORY_BROWSE("category_browse"),
    
    // Engagement Signals
    CONTENT_VIEW("content_view"),
    CONTENT_SHARE("content_share"),
    CONTENT_SAVE("content_save"),
    FORM_START("form_start"),
    FORM_ABANDON("form_abandon"),
    FORM_COMPLETE("form_complete"),
    
    // Session & Lifecycle
    SESSION_START("session_start"),
    SESSION_END("session_end"),
    SESSION_IDLE("session_idle"),
    APP_BACKGROUND("app_background"),
    APP_FOREGROUND("app_foreground"),
    
    // Intent Indicators
    PURCHASE_INTENT("purchase_intent"),
    BROWSE_INTENT("browse_intent"),
    COMPARE_INTENT("compare_intent"),
    EXIT_INTENT("exit_intent"),
    
    // Android Specific
    ACTIVITY_VIEW("activity_view"),
    FRAGMENT_VIEW("fragment_view"),
    DEEP_LINK("deep_link"),
    PUSH_NOTIFICATION("push_notification"),
    SCREEN_ON("screen_on"),
    SCREEN_OFF("screen_off"),
    
    // Custom
    CUSTOM("custom")
}

// MARK: - Configuration

@Serializable
data class AnonSDKConfiguration(
    val apiKey: String,
    val endpoint: String = "https://api.oncabaret.com/intent/graphql",
    val restEndpoint: String = "https://api.oncabaret.com/intent/event",
    val environment: Environment = Environment.PRODUCTION,
    val batchSize: Int = 50,
    val flushInterval: Long = 30000L, // 30 seconds
    val debugMode: Boolean = false,
    val privacy: PrivacySettings = PrivacySettings()
) {
    enum class Environment(val value: String) {
        PRODUCTION("production"),
        STAGING("staging"),
        DEVELOPMENT("development")
    }
    
    @Serializable
    data class PrivacySettings(
        val anonymizeLocation: Boolean = true,
        val sessionTimeout: Long = 30 * 60 * 1000L, // 30 minutes
        val dataRetention: Long = 365 * 24 * 60 * 60 * 1000L // 365 days
    )
}

// MARK: - Event Models

@Serializable
data class IntentEvent(
    val eventId: String,
    val eventName: String,
    val anonId: String,
    val sessionId: String,
    val timestamp: String,
    val properties: Map<String, JsonElement>? = null,
    val deviceMeta: DeviceMeta? = null,
    val geo: GeoLocation? = null,
    val platform: String,
    val environment: String,
    val sdkVersion: String
)

@Serializable
data class DeviceMeta(
    val platform: String,
    val platformVersion: String,
    val deviceModel: String,
    val deviceManufacturer: String,
    val screenWidth: Int,
    val screenHeight: Int,
    val screenDensity: Float,
    val language: String,
    val timezone: String,
    val isTablet: Boolean,
    val appVersion: String? = null,
    val packageName: String? = null
)

@Serializable
data class GeoLocation(
    val lat: Double,
    val lng: Double,
    val accuracy: Float? = null,
    val altitude: Double? = null,
    val bearing: Float? = null,
    val speed: Float? = null
)

// MARK: - Main SDK Class

class AnonSDK private constructor() {
    
    companion object {
        @JvmStatic
        val instance: AnonSDK by lazy { AnonSDK() }
        
        private const val TAG = "AnonSDK"
        private const val SDK_VERSION = "1.0.0"
        private const val PLATFORM = "Android"
        
        // Storage keys
        private const val PREFS_NAME = "AnonSDK"
        private const val KEY_ANON_ID = "anonId"
        private const val KEY_SESSION_ID = "sessionId"
        private const val KEY_PENDING_EVENTS = "pendingEvents"
        private const val KEY_LAST_SYNC = "lastSync"
        private const val KEY_CONSENT_STATUS = "consentStatus"
    }
    
    // Properties
    private lateinit var context: Context
    private lateinit var configuration: AnonSDKConfiguration
    private var isInitialized = false
    private var anonId: String? = null
    private var sessionId: String? = null
    private var sessionStartTime: Long = 0L
    private var pendingEvents = mutableListOf<IntentEvent>()
    private var hasConsent = false
    private var onConsentCallback: (() -> Boolean)? = null
    
    // Android-specific properties
    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var okHttpClient: OkHttpClient
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var connectivityManager: ConnectivityManager
    private var currentLocation: Location? = null
    private var isOnline = true
    
    // Coroutines
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var flushJob: Job? = null
    
    // JSON serializer
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }
    
    // MARK: - Initialization
    
    @JvmOverloads
    fun initialize(
        context: Context,
        configuration: AnonSDKConfiguration,
        onConsent: (() -> Boolean)? = null
    ) {
        if (isInitialized) {
            log("SDK already initialized")
            return
        }
        
        this.context = context.applicationContext
        this.configuration = configuration
        this.onConsentCallback = onConsent
        
        setupComponents()
        
        scope.launch {
            initializeAsync()
        }
    }
    
    private fun setupComponents() {
        // SharedPreferences
        sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // OkHttp client
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
        
        if (configuration.debugMode) {
            val loggingInterceptor = HttpLoggingInterceptor { message ->
                log("Network: $message")
            }
            loggingInterceptor.level = HttpLoggingInterceptor.Level.BODY
            builder.addInterceptor(loggingInterceptor)
        }
        
        okHttpClient = builder.build()
        
        // Location client
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
        
        // Connectivity manager
        connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        setupNetworkMonitoring()
        setupLifecycleMonitoring()
    }
    
    private suspend fun initializeAsync() {
        try {
            // Check consent
            hasConsent = checkConsent()
            
            if (!hasConsent) {
                log("User consent not granted, SDK will not track events")
                return
            }
            
            // Get or create anonymous ID
            anonId = getOrCreateAnonId()
            
            // Start new session
            startNewSession()
            
            // Load pending events
            loadPendingEvents()
            
            // Start flush timer
            startFlushTimer()
            
            // Request location permission and start tracking
            requestLocationUpdates()
            
            isInitialized = true
            
            // Track session start
            trackEvent(
                IntentEventType.SESSION_START,
                mapOf(
                    "session_id" to JsonPrimitive(sessionId ?: ""),
                    "platform" to JsonPrimitive(PLATFORM)
                )
            )
            
            log("Anonymous Intent SDK initialized successfully")
            
        } catch (e: Exception) {
            log("Error initializing SDK: ${e.message}")
        }
    }
    
    // MARK: - Public API
    
    suspend fun trackEvent(
        eventType: IntentEventType,
        properties: Map<String, JsonElement> = emptyMap(),
        deviceMeta: DeviceMeta? = null,
        geo: GeoLocation? = null
    ): String? {
        
        if (!isInitialized || !hasConsent) {
            log("SDK not initialized or consent not granted")
            return null
        }
        
        return try {
            val eventId = UUID.randomUUID().toString()
            
            val deviceMetaToUse = deviceMeta ?: getDeviceMeta()
            val geoToUse = geo ?: getCurrentGeoLocation()
            
            val event = IntentEvent(
                eventId = eventId,
                eventName = eventType.value,
                anonId = anonId ?: "",
                sessionId = sessionId ?: "",
                timestamp = getCurrentTimestamp(),
                properties = sanitizeProperties(properties),
                deviceMeta = deviceMetaToUse,
                geo = geoToUse,
                platform = PLATFORM,
                environment = configuration.environment.value,
                sdkVersion = SDK_VERSION
            )
            
            synchronized(pendingEvents) {
                pendingEvents.add(event)
            }
            
            savePendingEvents()
            
            log("Intent event tracked: ${eventType.value}")
            
            // Trigger immediate flush if batch size reached
            if (pendingEvents.size >= configuration.batchSize) {
                flushEvents()
            }
            
            eventId
            
        } catch (e: Exception) {
            log("Error tracking event: ${e.message}")
            null
        }
    }
    
    suspend fun flush() {
        flushEvents()
    }
    
    suspend fun setConsent(hasConsent: Boolean) {
        this.hasConsent = hasConsent
        sharedPreferences.edit()
            .putBoolean(KEY_CONSENT_STATUS, hasConsent)
            .apply()
        
        if (!hasConsent) {
            // Clear pending events and stop tracking
            synchronized(pendingEvents) {
                pendingEvents.clear()
            }
            savePendingEvents()
            stopFlushTimer()
            log("Consent revoked, tracking stopped")
        } else if (isInitialized) {
            // Resume tracking
            startFlushTimer()
            log("Consent granted, tracking resumed")
        }
    }
    
    fun hasUserConsent(): Boolean = hasConsent
    
    fun getPendingEventsCount(): Int = pendingEvents.size
    
    fun getAnonId(): String? = anonId
    
    fun getSessionId(): String? = sessionId
    
    fun cleanup() {
        stopFlushTimer()
        scope.cancel()
        isInitialized = false
        log("SDK cleaned up")
    }
    
    // MARK: - Android-Specific Tracking Methods
    
    suspend fun trackActivity(activity: Activity, properties: Map<String, JsonElement> = emptyMap()) {
        val props = properties.toMutableMap()
        props["activity_name"] = JsonPrimitive(activity.javaClass.simpleName)
        props["activity_title"] = JsonPrimitive(activity.title?.toString() ?: "Unknown")
        
        trackEvent(IntentEventType.ACTIVITY_VIEW, props)
    }
    
    suspend fun trackDeepLink(intent: Intent, properties: Map<String, JsonElement> = emptyMap()) {
        val uri = intent.data
        if (uri != null) {
            val props = properties.toMutableMap()
            props["deep_link_url"] = JsonPrimitive(uri.toString())
            props["deep_link_scheme"] = JsonPrimitive(uri.scheme ?: "")
            props["deep_link_host"] = JsonPrimitive(uri.host ?: "")
            
            trackEvent(IntentEventType.DEEP_LINK, props)
        }
    }
    
    suspend fun trackPushNotification(
        data: Map<String, String>,
        action: String,
        properties: Map<String, JsonElement> = emptyMap()
    ) {
        val props = properties.toMutableMap()
        props["notification_action"] = JsonPrimitive(action)
        props["notification_data"] = JsonObject(data.mapValues { JsonPrimitive(it.value) })
        
        trackEvent(IntentEventType.PUSH_NOTIFICATION, props)
    }
    
    // MARK: - Private Methods
    
    private fun checkConsent(): Boolean {
        if (sharedPreferences.contains(KEY_CONSENT_STATUS)) {
            return sharedPreferences.getBoolean(KEY_CONSENT_STATUS, false)
        }
        
        // Check with callback if no stored consent
        onConsentCallback?.let { callback ->
            val consent = callback()
            sharedPreferences.edit()
                .putBoolean(KEY_CONSENT_STATUS, consent)
                .apply()
            return consent
        }
        
        return false
    }
    
    private fun getOrCreateAnonId(): String {
        val existingId = sharedPreferences.getString(KEY_ANON_ID, null)
        if (existingId != null) {
            return existingId
        }
        
        val newId = "anon-${UUID.randomUUID()}"
        sharedPreferences.edit()
            .putString(KEY_ANON_ID, newId)
            .apply()
        
        return newId
    }
    
    private fun startNewSession() {
        sessionId = UUID.randomUUID().toString()
        sessionStartTime = System.currentTimeMillis()
        
        sessionId?.let { id ->
            sharedPreferences.edit()
                .putString(KEY_SESSION_ID, id)
                .apply()
        }
    }
    
    private fun loadPendingEvents() {
        try {
            val eventsJson = sharedPreferences.getString(KEY_PENDING_EVENTS, null)
            if (!eventsJson.isNullOrEmpty()) {
                val events = json.decodeFromString<List<IntentEvent>>(eventsJson)
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
            val eventsJson = json.encodeToString(pendingEvents)
            sharedPreferences.edit()
                .putString(KEY_PENDING_EVENTS, eventsJson)
                .apply()
        } catch (e: Exception) {
            log("Error saving pending events: ${e.message}")
        }
    }
    
    private suspend fun flushEvents() {
        if (!isOnline || pendingEvents.isEmpty() || !hasConsent) {
            return
        }
        
        val eventsToSend = synchronized(pendingEvents) {
            val batch = pendingEvents.take(configuration.batchSize)
            pendingEvents.removeAll(batch.toSet())
            batch
        }
        
        try {
            val success = sendEvents(eventsToSend)
            
            if (success) {
                savePendingEvents()
                
                sharedPreferences.edit()
                    .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
                    .apply()
                
                log("Successfully sent ${eventsToSend.size} intent events")
                
                // If more events pending, schedule next flush
                if (pendingEvents.isNotEmpty()) {
                    delay(100)
                    flushEvents()
                }
            } else {
                // Re-add events to pending list if send failed
                synchronized(pendingEvents) {
                    pendingEvents.addAll(0, eventsToSend)
                }
                savePendingEvents()
            }
        } catch (e: Exception) {
            log("Error flushing events: ${e.message}")
            // Re-add events to pending list
            synchronized(pendingEvents) {
                pendingEvents.addAll(0, eventsToSend)
            }
            savePendingEvents()
        }
    }
    
    private suspend fun sendEvents(events: List<IntentEvent>): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val payload = mapOf(
                    "apiKey" to configuration.apiKey,
                    "events" to events
                )
                
                val requestBody = json.encodeToString(payload)
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url(configuration.restEndpoint)
                    .post(requestBody)
                    .addHeader("Authorization", "Bearer ${configuration.apiKey}")
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val response = okHttpClient.newCall(request).execute()
                response.isSuccessful
                
            } catch (e: IOException) {
                log("Network error sending events: ${e.message}")
                false
            } catch (e: Exception) {
                log("Error sending events: ${e.message}")
                false
            }
        }
    }
    
    private fun getDeviceMeta(): DeviceMeta {
        val displayMetrics = context.resources.displayMetrics
        val packageManager = context.packageManager
        val packageInfo = try {
            packageManager.getPackageInfo(context.packageName, 0)
        } catch (e: Exception) {
            null
        }
        
        return DeviceMeta(
            platform = PLATFORM,
            platformVersion = Build.VERSION.RELEASE,
            deviceModel = Build.MODEL,
            deviceManufacturer = Build.MANUFACTURER,
            screenWidth = displayMetrics.widthPixels,
            screenHeight = displayMetrics.heightPixels,
            screenDensity = displayMetrics.density,
            language = Locale.getDefault().language,
            timezone = TimeZone.getDefault().id,
            isTablet = isTablet(),
            appVersion = packageInfo?.versionName,
            packageName = context.packageName
        )
    }
    
    private fun getCurrentGeoLocation(): GeoLocation? {
        val location = currentLocation ?: return null
        
        return if (configuration.privacy.anonymizeLocation) {
            // Reduce precision to ~1km for privacy
            GeoLocation(
                lat = Math.round(location.latitude * 100.0) / 100.0,
                lng = Math.round(location.longitude * 100.0) / 100.0,
                accuracy = location.accuracy,
                altitude = if (location.hasAltitude()) location.altitude else null,
                bearing = if (location.hasBearing()) location.bearing else null,
                speed = if (location.hasSpeed()) location.speed else null
            )
        } else {
            GeoLocation(
                lat = location.latitude,
                lng = location.longitude,
                accuracy = location.accuracy,
                altitude = if (location.hasAltitude()) location.altitude else null,
                bearing = if (location.hasBearing()) location.bearing else null,
                speed = if (location.hasSpeed()) location.speed else null
            )
        }
    }
    
    private fun sanitizeProperties(properties: Map<String, JsonElement>): Map<String, JsonElement> {
        val sanitized = properties.toMutableMap()
        
        // Remove common PII fields
        val piiFields = listOf("email", "phone", "name", "address", "creditCard", "ssn")
        piiFields.forEach { sanitized.remove(it) }
        
        return sanitized
    }
    
    private fun startFlushTimer() {
        stopFlushTimer()
        
        flushJob = scope.launch {
            while (isActive) {
                delay(configuration.flushInterval)
                flushEvents()
            }
        }
    }
    
    private fun stopFlushTimer() {
        flushJob?.cancel()
        flushJob = null
    }
    
    @SuppressLint("MissingPermission")
    private fun requestLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            log("Location permission not granted")
            return
        }
        
        val locationRequest = LocationRequest.Builder(300000L) // 5 minutes
            .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
            .build()
        
        val locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                currentLocation = result.lastLocation
            }
        }
        
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            context.mainLooper
        )
    }
    
    private fun setupNetworkMonitoring() {
        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isOnline = true
                if (pendingEvents.isNotEmpty()) {
                    scope.launch {
                        flushEvents()
                    }
                }
            }
            
            override fun onLost(network: Network) {
                isOnline = false
            }
        }
        
        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
    }
    
    private fun setupLifecycleMonitoring() {
        if (context is Application) {
            ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
                override fun onStart(owner: LifecycleOwner) {
                    scope.launch {
                        trackEvent(IntentEventType.APP_FOREGROUND)
                    }
                }
                
                override fun onStop(owner: LifecycleOwner) {
                    scope.launch {
                        trackEvent(
                            IntentEventType.APP_BACKGROUND,
                            mapOf(
                                "session_duration" to JsonPrimitive(
                                    System.currentTimeMillis() - sessionStartTime
                                )
                            )
                        )
                        flushEvents()
                    }
                }
            })
        }
    }
    
    private fun isTablet(): Boolean {
        val displayMetrics = context.resources.displayMetrics
        val screenWidthDp = displayMetrics.widthPixels / displayMetrics.density
        val screenHeightDp = displayMetrics.heightPixels / displayMetrics.density
        val screenSizeInches = Math.sqrt(
            Math.pow(screenWidthDp.toDouble(), 2.0) + Math.pow(screenHeightDp.toDouble(), 2.0)
        ) / 160.0
        
        return screenSizeInches >= 7.0
    }
    
    private fun getCurrentTimestamp(): String {
        return java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date())
    }
    
    private fun log(message: String) {
        if (configuration.debugMode) {
            Log.d(TAG, message)
        }
    }
}