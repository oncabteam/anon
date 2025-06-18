package io.vibemesh.example

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import io.vibemesh.sdk.VibeMesh
import kotlinx.coroutines.launch
import java.util.*

class MainActivity : AppCompatActivity() {
    
    private lateinit var statusText: TextView
    private lateinit var userIdText: TextView
    private lateinit var sessionIdText: TextView
    private lateinit var pendingEventsText: TextView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        setupUI()
        setupVibeMesh()
        startUIUpdates()
    }
    
    private fun setupUI() {
        title = "VibeMesh Android Example"
        
        statusText = findViewById(R.id.statusText)
        userIdText = findViewById(R.id.userIdText)
        sessionIdText = findViewById(R.id.sessionIdText)
        pendingEventsText = findViewById(R.id.pendingEventsText)
        
        // Event tracking buttons
        findViewById<Button>(R.id.btnTrackScreenView).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.trackScreenView("ExampleScreen", "MainActivity")
                showToast("Screen view tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackButtonTap).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.trackButtonTap("Example Button")
                showToast("Button tap tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackSearch).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.trackSearch(
                    query = "jazz clubs",
                    resultCount = 5,
                    filters = mapOf(
                        "location" to "San Francisco",
                        "category" to "music"
                    )
                )
                showToast("Search tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackPurchase).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.trackPurchase(
                    transactionId = "txn_${UUID.randomUUID()}",
                    amount = 29.99,
                    currency = "USD",
                    items = listOf(
                        mapOf(
                            "name" to "Concert Ticket",
                            "price" to "29.99",
                            "quantity" to "1"
                        )
                    )
                )
                showToast("Purchase tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackContentView).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.trackContentView(
                    contentId = "content_123",
                    contentType = "article",
                    contentName = "How to Use VibeMesh"
                )
                showToast("Content view tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnFlushEvents).setOnClickListener {
            VibeMesh.instance.flush()
            showToast("Events flushed to server!")
        }
        
        findViewById<Button>(R.id.btnToggleOptOut).setOnClickListener {
            lifecycleScope.launch {
                if (VibeMesh.instance.isOptedOutStatus()) {
                    VibeMesh.instance.optIn()
                    showToast("Opted back into tracking")
                } else {
                    VibeMesh.instance.optOut()
                    showToast("Opted out of tracking")
                }
            }
        }
        
        // Custom event examples
        findViewById<Button>(R.id.btnTrackVenueView).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.track(
                    eventType = "view_venue",
                    context = mapOf(
                        "venue_id" to "venue_123",
                        "venue_name" to "Blue Note Jazz Club",
                        "category" to "music_venue",
                        "tags" to "jazz,live_music,cocktails"
                    )
                )
                showToast("Venue view tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackEventView).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.track(
                    eventType = "view_event",
                    context = mapOf(
                        "event_id" to "event_456",
                        "event_name" to "Jazz Night",
                        "venue_id" to "venue_123",
                        "date" to "2024-12-01T20:00:00Z",
                        "tags" to "jazz,live"
                    )
                )
                showToast("Event view tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnTrackMapInteraction).setOnClickListener {
            lifecycleScope.launch {
                VibeMesh.instance.track(
                    eventType = "map_interaction",
                    context = mapOf(
                        "interaction_type" to "zoom",
                        "zoom_level" to "14",
                        "center_lat" to "37.7749",
                        "center_lng" to "-122.4194"
                    )
                )
                showToast("Map interaction tracked!")
            }
        }
        
        findViewById<Button>(R.id.btnShowPrivacyControls).setOnClickListener {
            showPrivacyDialog()
        }
    }
    
    private fun setupVibeMesh() {
        lifecycleScope.launch {
            try {
                val config = VibeMesh.Configuration(
                    apiKey = "your-api-key-here",
                    enableGeolocation = true,
                    enableAutoTracking = true,
                    debugMode = true
                )
                
                VibeMesh.instance.initialize(this@MainActivity, config)
                
                runOnUiThread {
                    statusText.text = "✅ Initialized"
                    statusText.setTextColor(getColor(android.R.color.holo_green_dark))
                }
            } catch (e: Exception) {
                println("Failed to initialize VibeMesh: $e")
                runOnUiThread {
                    statusText.text = "❌ Failed to Initialize"
                    statusText.setTextColor(getColor(android.R.color.holo_red_dark))
                }
            }
        }
    }
    
    private fun startUIUpdates() {
        // Update UI every second
        val updateRunnable = object : Runnable {
            override fun run() {
                updateUI()
                findViewById<Button>(R.id.btnFlushEvents).postDelayed(this, 1000)
            }
        }
        findViewById<Button>(R.id.btnFlushEvents).post(updateRunnable)
    }
    
    private fun updateUI() {
        userIdText.text = "User ID: ${VibeMesh.instance.getUserId() ?: "Loading..."}"
        sessionIdText.text = "Session ID: ${VibeMesh.instance.getSessionId() ?: "Loading..."}"
        pendingEventsText.text = "Pending Events: ${VibeMesh.instance.getPendingEventsCount()}"
    }
    
    private fun showToast(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun showPrivacyDialog() {
        AlertDialog.Builder(this)
            .setTitle("Privacy Controls")
            .setMessage("VibeMesh respects your privacy. You can opt-out of tracking at any time.")
            .setPositiveButton("View Privacy Policy") { _, _ ->
                // Open privacy policy URL
                // startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://vibemesh.io/privacy")))
            }
            .setNegativeButton("Opt Out") { _, _ ->
                lifecycleScope.launch {
                    VibeMesh.instance.optOut()
                    showToast("You have opted out of tracking")
                }
            }
            .setNeutralButton("Cancel", null)
            .show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        VibeMesh.instance.cleanup()
    }
}

// Example custom Activity with automatic tracking
class ProductActivity : AppCompatActivity() {
    private var productId: String? = null
    private var productName: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        productId = intent.getStringExtra("product_id")
        productName = intent.getStringExtra("product_name")
    }
    
    override fun onResume() {
        super.onResume()
        
        // Custom tracking for product views
        lifecycleScope.launch {
            VibeMesh.instance.track(
                eventType = "view_product",
                context = mapOf(
                    "product_id" to (productId ?: ""),
                    "product_name" to (productName ?: ""),
                    "screen_name" to "ProductActivity"
                )
            )
        }
    }
}

// Example custom Application class for early initialization
class ExampleApplication : android.app.Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Early VibeMesh initialization
        lifecycleScope.launch {
            val config = VibeMesh.Configuration(
                apiKey = "your-api-key-here",
                enableAutoTracking = true,
                debugMode = BuildConfig.DEBUG
            )
            
            try {
                VibeMesh.instance.initialize(this@ExampleApplication, config)
                println("VibeMesh initialized in Application class")
            } catch (e: Exception) {
                println("Failed to initialize VibeMesh in Application: $e")
            }
        }
    }
}