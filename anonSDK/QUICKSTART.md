# VibeMesh Universal SDK - Quick Start Guide

Get tracking in **under 5 minutes** with automatic event detection across all platforms.

## 🚀 Super Quick Start

### Web (Instant Setup)
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="vibemesh-api-key" content="YOUR_API_KEY">
  <script src="https://cdn.vibemesh.io/v1/vibemesh.min.js"></script>
</head>
<body>
  <!-- All interactions automatically tracked! -->
  <button onclick="alert('Purchase!')">Buy Now</button>
  <input type="search" placeholder="Search products...">
  <video src="demo.mp4" controls></video>
</body>
</html>
```

**That's it!** All clicks, forms, videos, and page views are automatically tracked.

### React Native (Zero Config)
```bash
npm install @vibemesh/react-native-sdk
```

```jsx
// App.js
import VibeMesh from '@vibemesh/react-native-sdk';

export default function App() {
  useEffect(() => {
    VibeMesh.init({ clientId: 'YOUR_API_KEY' });
  }, []);

  return (
    <NavigationContainer>
      {/* All screens and taps automatically tracked */}
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### iOS Native (Automatic Swizzling)
```swift
// AppDelegate.swift
import VibeMesh

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    let config = VibeMesh.Configuration(apiKey: "YOUR_API_KEY")
    
    Task {
        try await VibeMesh.shared.initialize(config: config)
    }
    
    return true
}
```

All `UIViewController` screens and `UIButton` taps automatically tracked!

### Android Native (Lifecycle Tracking)
```kotlin
// Application.kt
import io.vibemesh.sdk.VibeMesh

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        lifecycleScope.launch {
            val config = VibeMesh.Configuration(apiKey = "YOUR_API_KEY")
            VibeMesh.instance.initialize(this@MyApplication, config)
        }
    }
}
```

All `Activity` screens and button clicks automatically tracked!

## 📱 Platform-Specific Setup

### 1. Web Platform

#### Option A: Auto-Initialize (Recommended)
```html
<!-- Add to <head> -->
<meta name="vibemesh-api-key" content="YOUR_API_KEY">
<script src="https://cdn.vibemesh.io/v1/vibemesh.min.js"></script>
```

#### Option B: Manual Control
```javascript
import VibeMesh from '@vibemesh/web-sdk';

await VibeMesh.init({
  clientId: 'YOUR_API_KEY',
  autoTracking: {
    pageViews: true,
    clicks: true,
    scrollDepth: true,
    formSubmits: true,
    videoInteractions: true,
    ecommerce: true
  }
});
```

#### What's Automatically Tracked:
- ✅ Page views (including SPA navigation)
- ✅ All clicks with element context
- ✅ Scroll depth (25%, 50%, 75%, 100%)
- ✅ Form submissions and interactions
- ✅ Video play/pause/milestones
- ✅ File downloads
- ✅ Search queries
- ✅ E-commerce patterns (Add to Cart, Checkout)
- ✅ JavaScript errors
- ✅ Page performance metrics

### 2. React Native Platform

#### Installation
```bash
npm install @vibemesh/react-native-sdk
cd ios && pod install  # iOS only
```

#### Setup
```jsx
import VibeMesh from '@vibemesh/react-native-sdk';

// Initialize in App.js
useEffect(() => {
  VibeMesh.init({
    clientId: 'YOUR_API_KEY',
    geo: true,  // Optional: location context
    debugMode: __DEV__
  });
}, []);
```

#### What's Automatically Tracked:
- ✅ Screen navigation (React Navigation integration)
- ✅ TouchableOpacity/Button taps
- ✅ ScrollView scroll depth
- ✅ TextInput interactions (no content)
- ✅ Gesture recognizer events
- ✅ App foreground/background
- ✅ Device orientation changes

### 3. iOS Native Platform

#### Installation

**CocoaPods:**
```ruby
# Podfile
pod 'VibeMesh', '~> 1.0'
```

**Swift Package Manager:**
```swift
// Package.swift
.package(url: "https://github.com/vibemesh/universal-sdk", from: "1.0.0")
```

#### Setup
```swift
import VibeMesh

// AppDelegate.swift or SceneDelegate.swift
let config = VibeMesh.Configuration(
    apiKey: "YOUR_API_KEY",
    enableGeolocation: true,  // Optional
    enableAutoTracking: true, // Method swizzling
    debugMode: true
)

Task {
    try await VibeMesh.shared.initialize(config: config)
}
```

#### What's Automatically Tracked:
- ✅ UIViewController viewDidAppear (screen views)
- ✅ UIButton and UIControl actions
- ✅ App lifecycle (foreground/background)
- ✅ Location context (with permission)
- ✅ Session management
- ✅ Device and OS information

### 4. Android Native Platform

#### Installation
```gradle
// build.gradle (app)
implementation 'io.vibemesh:vibemesh-android:1.0.0'
```

#### Setup
```kotlin
import io.vibemesh.sdk.VibeMesh

// Application.kt
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        lifecycleScope.launch {
            val config = VibeMesh.Configuration(
                apiKey = "YOUR_API_KEY",
                enableGeolocation = true,
                enableAutoTracking = true,
                debugMode = BuildConfig.DEBUG
            )
            
            VibeMesh.instance.initialize(this@MyApplication, config)
        }
    }
}
```

```xml
<!-- AndroidManifest.xml -->
<application android:name=".MyApplication">
```

#### What's Automatically Tracked:
- ✅ Activity lifecycle (screen views)
- ✅ Button and View clicks
- ✅ Fragment navigation
- ✅ App process lifecycle
- ✅ Location context (with permission)
- ✅ System information

### 5. Node.js Platform (DOOH/Billboards)

#### Installation
```bash
npm install @vibemesh/node-sdk
```

#### Setup
```javascript
const { VibeMeshNode } = require('@vibemesh/node-sdk');

const vibeMesh = new VibeMeshNode();

await vibeMesh.init({
  clientId: 'YOUR_API_KEY',
  deviceId: 'billboard-001',
  locationId: 'times-square-north',
  staticLocation: { lat: 40.7580, lng: -73.9855 }
});

// Billboard content automatically tracked
await vibeMesh.trackImpression('content-id', 30000, 15); // 30s, 15 viewers
```

## 🎯 Manual Tracking (When Needed)

While auto-tracking covers 90% of use cases, use manual tracking for custom business events:

### Universal API (All Platforms)
```javascript
// High-level convenience methods
await VibeMesh.trackPurchase({
  transactionId: 'txn_123',
  amount: 29.99,
  currency: 'USD',
  items: [{ name: 'Concert Ticket', price: 29.99 }]
});

await VibeMesh.trackSearch({
  query: 'jazz clubs',
  resultCount: 5,
  filters: { location: 'SF', category: 'music' }
});

// Custom events
await VibeMesh.track('venue_view', {
  venue_id: 'venue_123',
  venue_name: 'Blue Note Jazz Club',
  category: 'music_venue'
});
```

### Platform-Specific Examples

**iOS:**
```swift
await VibeMesh.shared.trackContentView(
    contentId: "product_123",
    contentType: "product",
    contentName: "Wireless Headphones"
)
```

**Android:**
```kotlin
VibeMesh.instance.trackContentView(
    contentId = "product_123",
    contentType = "product",
    contentName = "Wireless Headphones"
)
```

## 🔐 Privacy Controls

### Opt-Out/Opt-In
```javascript
// Check current status
if (VibeMesh.isOptedOut()) {
  console.log('User has opted out');
}

// Opt out
await VibeMesh.optOut();

// Opt back in
await VibeMesh.optIn();
```

### GDPR Compliance
```javascript
// Show consent dialog
const hasConsent = await showGDPRDialog();
if (!hasConsent) {
  await VibeMesh.optOut();
}
```

## 🛠 Advanced Configuration

### Full Configuration Options
```javascript
await VibeMesh.init({
  clientId: 'YOUR_API_KEY',
  endpoint: 'https://api.vibemesh.io/events',
  
  // Privacy
  geo: false,              // Disable location tracking
  anonymous: true,         // Force anonymous mode
  
  // Performance
  batchSize: 50,           // Events per batch
  flushInterval: 30000,    // Auto-flush interval (ms)
  
  // Features
  autoTracking: {
    pageViews: true,       // Web: Page navigation
    clicks: true,          // All: Click/tap events
    scrollDepth: true,     // Web: Scroll milestones
    formSubmits: true,     // Web: Form interactions
    videoInteractions: true, // Web: Media events
    ecommerce: true,       // Web: Shopping patterns
    errorTracking: true,   // Web: JS errors
    performanceTracking: true // Web: Load metrics
  },
  
  // Development
  debugMode: true          // Console logging
});
```

## 🔍 Debugging & Monitoring

### Enable Debug Mode
```javascript
await VibeMesh.init({
  clientId: 'YOUR_API_KEY',
  debugMode: true  // Shows detailed logs
});
```

### Check SDK Status
```javascript
console.log('Status:', {
  initialized: VibeMesh.isInitialized(),
  userId: VibeMesh.getUserId(),
  sessionId: VibeMesh.getSessionId(),
  pendingEvents: VibeMesh.getPendingEventsCount(),
  optedOut: VibeMesh.isOptedOut()
});
```

### Manual Flush
```javascript
// Force send pending events
await VibeMesh.flush();
```

## 📊 Viewing Your Data

### Real-Time Dashboard
1. Visit [dashboard.vibemesh.io](https://dashboard.vibemesh.io)
2. Enter your API key
3. View live events and analytics

### Event Format
All events follow this structure:
```json
{
  "event_id": "evt_123",
  "event_type": "screen_view",
  "timestamp": "2024-01-01T12:00:00Z",
  "uuid": "anon-abc123",
  "session_id": "ses_789",
  "platform": "web",
  "context": {
    "page_url": "/products",
    "page_title": "Products - My Store"
  },
  "geo_context": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

## 🚀 Next Steps

1. **Get Your API Key**: [Sign up at vibemesh.io](https://vibemesh.io/signup)
2. **Choose Your Platform**: Follow the setup guide above
3. **Test Integration**: Use debug mode to verify events
4. **Go Live**: Deploy and start collecting insights!

## 📚 Additional Resources

- **[Complete Documentation](https://docs.vibemesh.io)**
- **[API Reference](https://api.vibemesh.io/docs)**
- **[Example Apps](./examples/)**
- **[Migration Guide](./MIGRATION.md)**

## 🆘 Common Issues

### "Events not showing up"
- Check your API key is correct
- Verify network connectivity
- Enable debug mode to see logs
- Check if user has opted out

### "Auto-tracking not working"
- Ensure `autoTracking` is enabled in config
- Check platform-specific requirements (permissions, etc.)
- Verify SDK initialization completed successfully

### "Performance concerns"
- SDK is lightweight (2-3KB gzipped for web)
- Events are batched to minimize network calls
- Local storage prevents data loss
- Minimal CPU and battery impact

---

**Need Help?** Contact [support@vibemesh.io](mailto:support@vibemesh.io) or check our [documentation](https://docs.vibemesh.io).