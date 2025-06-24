/**
 * ViewModel for Android Anonymous Intent SDK Example
 * Manages SDK state and provides reactive data for the UI
 */

package com.oncabaret.anon.intent.example

import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.oncabaret.anon.intent.sdk.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import java.util.*

class MainViewModel : ViewModel() {
    
    // Private mutable state flows
    private val _isInitialized = MutableStateFlow(false)
    private val _sdkStatus = MutableStateFlow("Initializing...")
    private val _hasConsent = MutableStateFlow(false)
    private val _eventsTracked = MutableStateFlow(0)
    private val _sessionTime = MutableStateFlow("0s")
    private val _pendingEvents = MutableStateFlow(0)
    private val _anonymousId = MutableStateFlow("Loading...")
    
    // Public state flows
    val isInitialized: StateFlow<Boolean> = _isInitialized.asStateFlow()
    val sdkStatus: StateFlow<String> = _sdkStatus.asStateFlow()
    val hasConsent: StateFlow<Boolean> = _hasConsent.asStateFlow()
    val eventsTracked: StateFlow<Int> = _eventsTracked.asStateFlow()
    val sessionTime: StateFlow<String> = _sessionTime.asStateFlow()
    val pendingEvents: StateFlow<Int> = _pendingEvents.asStateFlow()
    val anonymousId: StateFlow<String> = _anonymousId.asStateFlow()
    
    private var sessionStartTime = System.currentTimeMillis()
    private var hasLocationPermission = false
    
    init {
        startTimer()
        checkSDKStatus()
    }
    
    fun locationPermissionGranted() {
        hasLocationPermission = true
        updateMetrics()
    }
    
    suspend fun setConsent(consent: Boolean) {
        _hasConsent.value = consent
        AnonSDK.instance.setConsent(consent)
        updateMetrics()
    }
    
    suspend fun trackEvent(
        eventType: IntentEventType,
        properties: Map<String, JsonElement> = emptyMap()
    ): String? {
        val eventId = AnonSDK.instance.trackEvent(eventType, properties)
        
        if (eventId != null) {
            _eventsTracked.value = _eventsTracked.value + 1
            updateMetrics()
        }
        
        return eventId
    }
    
    suspend fun trackActivity() {
        // Simulate tracking an activity since we can't get the real activity from the ViewModel
        val mockProperties = mapOf(
            "activity_name" to JsonPrimitive("MainActivity"),
            "activity_title" to JsonPrimitive("Demo Activity"),
            "source" to JsonPrimitive("demo_button")
        )
        
        trackEvent(IntentEventType.ACTIVITY_VIEW, mockProperties)
    }
    
    suspend fun trackDeepLink() {
        // Simulate tracking a deep link
        val mockProperties = mapOf(
            "deep_link_url" to JsonPrimitive("oncab://venue/123?source=notification"),
            "deep_link_scheme" to JsonPrimitive("oncab"),
            "deep_link_host" to JsonPrimitive("venue"),
            "source" to JsonPrimitive("demo_button")
        )
        
        trackEvent(IntentEventType.DEEP_LINK, mockProperties)
    }
    
    suspend fun trackPushNotification() {
        // Simulate tracking a push notification
        val mockData = mapOf(
            "venue_id" to "venue_123",
            "event_id" to "event_456",
            "alert" to "New event near you!"
        )
        
        AnonSDK.instance.trackPushNotification(
            data = mockData,
            action = "opened",
            properties = mapOf(
                "source" to JsonPrimitive("demo_button")
            )
        )
        
        _eventsTracked.value = _eventsTracked.value + 1
        updateMetrics()
    }
    
    suspend fun flushEvents() {
        AnonSDK.instance.flush()
        updateMetrics()
    }
    
    private fun updateMetrics() {
        viewModelScope.launch {
            try {
                _pendingEvents.value = AnonSDK.instance.getPendingEventsCount()
                _hasConsent.value = AnonSDK.instance.hasUserConsent()
                
                AnonSDK.instance.getAnonId()?.let { anonId ->
                    _anonymousId.value = if (anonId.length > 12) {
                        "${anonId.take(12)}..."
                    } else {
                        anonId
                    }
                }
                
                updateSessionTime()
                
            } catch (e: Exception) {
                // Handle any errors silently in demo
            }
        }
    }
    
    private fun updateSessionTime() {
        val elapsed = (System.currentTimeMillis() - sessionStartTime) / 1000
        _sessionTime.value = "${elapsed}s"
    }
    
    private fun checkSDKStatus() {
        viewModelScope.launch {
            try {
                // Simulate initialization check
                kotlinx.coroutines.delay(1000)
                
                _isInitialized.value = true
                _sdkStatus.value = "Ready ✅"
                _hasConsent.value = AnonSDK.instance.hasUserConsent()
                
                updateMetrics()
                
            } catch (e: Exception) {
                _sdkStatus.value = "Error: ${e.message}"
            }
        }
    }
    
    private fun startTimer() {
        viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(1000) // Update every second
                updateSessionTime()
                updateMetrics()
            }
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        // Cleanup is handled by the SDK itself
    }
}