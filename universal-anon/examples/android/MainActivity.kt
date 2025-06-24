/**
 * Android Example for OnCabaret Anonymous Intent SDK
 * Demonstrates integration and usage patterns with Jetpack Compose
 */

package com.oncabaret.anon.intent.example

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.oncabaret.anon.intent.sdk.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive

class MainActivity : ComponentActivity() {
    
    private val viewModel = MainViewModel()
    
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineLocationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseLocationGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        
        if (fineLocationGranted || coarseLocationGranted) {
            viewModel.locationPermissionGranted()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize SDK
        val configuration = AnonSDKConfiguration(
            apiKey = "demo-api-key-android-12345",
            environment = AnonSDKConfiguration.Environment.DEVELOPMENT,
            debugMode = true
        )
        
        AnonSDK.instance.initialize(this, configuration) {
            viewModel.hasConsent.value
        }
        
        // Request location permission
        requestLocationPermissionIfNeeded()
        
        setContent {
            AnonSDKDemoTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainScreen(viewModel)
                }
            }
        }
        
        // Track activity view
        lifecycleScope.launch {
            AnonSDK.instance.trackActivity(this@MainActivity)
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        
        // Track deep link if present
        intent?.let {
            lifecycleScope.launch {
                AnonSDK.instance.trackDeepLink(it)
            }
        }
    }
    
    private fun requestLocationPermissionIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
            != PackageManager.PERMISSION_GRANTED) {
            locationPermissionLauncher.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: MainViewModel) {
    val scope = rememberCoroutineScope()
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Header
            HeaderSection()
        }
        
        item {
            // SDK Status
            StatusSection(viewModel)
        }
        
        item {
            // Consent Management
            ConsentSection(viewModel, scope)
        }
        
        item {
            // Live Metrics
            MetricsSection(viewModel)
        }
        
        item {
            // Event Tracking Demo
            EventTrackingSection(viewModel, scope)
        }
        
        item {
            // Android-Specific Features
            AndroidFeaturesSection(viewModel, scope)
        }
    }
}

@Composable
fun HeaderSection() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Analytics,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "🎯 Anonymous Intent SDK",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Text(
                text = "Privacy-first behavioral analytics for Android",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

@Composable
fun StatusSection(viewModel: MainViewModel) {
    val sdkStatus by viewModel.sdkStatus.collectAsState()
    val isInitialized by viewModel.isInitialized.collectAsState()
    
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = null,
                    tint = if (isInitialized) Color.Green else Color.Orange
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = "SDK Status",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = sdkStatus,
                style = MaterialTheme.typography.bodyLarge,
                color = if (isInitialized) Color.Green else Color.Orange
            )
        }
    }
}

@Composable
fun ConsentSection(viewModel: MainViewModel, scope: CoroutineScope) {
    val hasConsent by viewModel.hasConsent.collectAsState()
    
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = null,
                    tint = Color.Green
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = "Privacy & Consent",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Consent Status:",
                    style = MaterialTheme.typography.bodyMedium
                )
                
                Text(
                    text = if (hasConsent) "Granted ✅" else "Revoked ❌",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = if (hasConsent) Color.Green else Color.Red
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        scope.launch {
                            viewModel.setConsent(true)
                        }
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Green)
                ) {
                    Text("Grant Consent")
                }
                
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            viewModel.setConsent(false)
                        }
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Revoke Consent")
                }
            }
        }
    }
}

@Composable
fun MetricsSection(viewModel: MainViewModel) {
    val eventsTracked by viewModel.eventsTracked.collectAsState()
    val sessionTime by viewModel.sessionTime.collectAsState()
    val pendingEvents by viewModel.pendingEvents.collectAsState()
    val anonymousId by viewModel.anonymousId.collectAsState()
    
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Analytics,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = "Live Session Metrics",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricCard(
                    title = "Events Tracked",
                    value = eventsTracked.toString(),
                    icon = Icons.Default.Numbers,
                    modifier = Modifier.weight(1f)
                )
                
                MetricCard(
                    title = "Session Time",
                    value = sessionTime,
                    icon = Icons.Default.AccessTime,
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricCard(
                    title = "Pending Events",
                    value = pendingEvents.toString(),
                    icon = Icons.Default.Inbox,
                    modifier = Modifier.weight(1f)
                )
                
                MetricCard(
                    title = "Anonymous ID",
                    value = anonymousId,
                    icon = Icons.Default.Key,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun EventTrackingSection(viewModel: MainViewModel, scope: CoroutineScope) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.TouchApp,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.secondary
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = "Event Tracking Demo",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Try these interactions to see anonymous intent tracking:",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    EventButton(
                        title = "Tap to Save",
                        icon = Icons.Default.Favorite,
                        color = Color.Red
                    ) {
                        scope.launch {
                            viewModel.trackEvent(
                                IntentEventType.TAP_TO_SAVE,
                                mapOf(
                                    "item_id" to JsonPrimitive("demo_item_1"),
                                    "category" to JsonPrimitive("demo")
                                )
                            )
                        }
                    }
                }
                
                item {
                    EventButton(
                        title = "Purchase Intent",
                        icon = Icons.Default.ShoppingCart,
                        color = Color.Green
                    ) {
                        scope.launch {
                            viewModel.trackEvent(
                                IntentEventType.PURCHASE_INTENT,
                                mapOf(
                                    "product_category" to JsonPrimitive("demo"),
                                    "price_range" to JsonPrimitive("medium")
                                )
                            )
                        }
                    }
                }
                
                item {
                    EventButton(
                        title = "Search Query",
                        icon = Icons.Default.Search,
                        color = Color.Blue
                    ) {
                        scope.launch {
                            viewModel.trackEvent(
                                IntentEventType.SEARCH,
                                mapOf(
                                    "search_query" to JsonPrimitive("coffee shops near me"),
                                    "results_count" to JsonPrimitive(12)
                                )
                            )
                        }
                    }
                }
                
                item {
                    EventButton(
                        title = "Content Share",
                        icon = Icons.Default.Share,
                        color = Color(0xFFFF9800)
                    ) {
                        scope.launch {
                            viewModel.trackEvent(
                                IntentEventType.CONTENT_SHARE,
                                mapOf(
                                    "content_type" to JsonPrimitive("venue"),
                                    "share_method" to JsonPrimitive("link")
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EventButton(
    title: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = color),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.width(120.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = Color.White
            )
        }
    }
}

@Composable
fun AndroidFeaturesSection(viewModel: MainViewModel, scope: CoroutineScope) {
    val context = LocalContext.current
    
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.PhoneAndroid,
                    contentDescription = null,
                    tint = Color(0xFF4CAF50)
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                Text(
                    text = "Android-Specific Features",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            viewModel.trackActivity()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(imageVector = Icons.Default.Visibility, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Track Activity View")
                }
                
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            viewModel.trackDeepLink()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(imageVector = Icons.Default.Link, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Track Deep Link")
                }
                
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            viewModel.trackPushNotification()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(imageVector = Icons.Default.Notifications, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Track Push Notification")
                }
                
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            viewModel.flushEvents()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(imageVector = Icons.Default.Sync, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Flush Events")
                }
            }
        }
    }
}

@Composable
fun AnonSDKDemoTheme(content: @Composable () -> Unit) {
    MaterialTheme {
        content()
    }
}

@Preview(showBackground = true)
@Composable
fun MainScreenPreview() {
    AnonSDKDemoTheme {
        MainScreen(MainViewModel())
    }
}