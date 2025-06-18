# VibeMesh Universal SDK

A comprehensive, privacy-first analytics SDK that works seamlessly across all platforms with **automatic event detection**. Just initialize with your API key and start tracking!

## 🚀 **Plug-and-Play Analytics**

```javascript
// Web - Automatic tracking starts immediately
VibeMesh.init({ clientId: 'your-api-key' });

// React Native - Auto-tracks screens, taps, and interactions
await VibeMesh.init({ clientId: 'your-api-key' });

// iOS - Automatic screen and button tracking
try await VibeMesh.shared.initialize(config: config)

// Android - Auto-tracks activities and interactions
VibeMesh.instance.initialize(context, config)
```

**That's it!** No manual tracking code needed. The SDK automatically detects and tracks:
- **Page/Screen Views** - Every page visit and screen change
- **User Interactions** - Clicks, taps, form submissions, scrolling
- **E-commerce Events** - Add to cart, checkout, purchases
- **Media Engagement** - Video play/pause, download tracking
- **Search Behavior** - Search queries and interactions
- **Performance Metrics** - Page load times, error tracking

## 🌍 **Universal Platform Support**

| Platform | Package | Auto-Tracking | Size |
|----------|---------|---------------|------|
| **Web** | `npm install @vibemesh/web-sdk` | ✅ Comprehensive | 2.3KB gzipped |
| **React Native** | `npm install @vibemesh/react-native-sdk` | ✅ Full mobile UX | 45KB |
| **iOS Native** | CocoaPods, SPM | ✅ UIKit swizzling | 180KB |
| **Android Native** | Gradle, Maven | ✅ Activity lifecycle | 220KB |
| **Node.js/DOOH** | `npm install @vibemesh/node-sdk` | ✅ System events | 28KB |

## � **LiDAR Billboard Extension** 🆕

Transform any digital billboard into an intelligent, audience-aware advertising platform with **real-time crowd analytics** and **privacy-first design**.

### **Features**
- 🎯 **Real-time Crowd Detection** - Accurate people counting and clustering
- 📊 **Engagement Analysis** - Attention tracking and dwell time measurement
- 🌊 **Flow Pattern Analysis** - Pedestrian movement and direction tracking
- 🚨 **Anomaly Detection** - Crowd surges, unusual patterns, safety alerts
- 🔄 **Dynamic Content Optimization** - Automatic content selection based on audience
- 🔒 **Privacy-First Design** - No facial recognition, anonymous data only

### **Supported Hardware**
| LiDAR Sensor | Range | Best Use Case | Price Range |
|--------------|-------|---------------|-------------|
| **Intel RealSense D455** | 20m | Outdoor Billboards | $300-400 |
| **Ouster OS1-64** | 120m | Large Outdoor Areas | $8,000+ |
| **Hesai Pandar QT** | 20m | Premium Automotive | $2,000+ |

### **Quick Start**
```javascript
import VibeMeshLiDAR from '@vibemesh/billboard-lidar';

const billboard = new VibeMeshLiDAR();

// Initialize with minimal configuration
await billboard.initializeLiDAR({
  apiKey: 'your-api-key',
  billboardId: 'bb_times_square_001',
  location: { lat: 40.7580, lng: -73.9855 },
  lidar: {
    sensorType: 'intel_realsense_d455',
    computeUnit: 'jetson_orin'
  }
});

// Real-time context-driven content optimization
const context = billboard.getCurrentContext();
if (context.clusterCount > 10 && context.engagementScore > 0.7) {
  displayPremiumContent(); // High engagement detected
}
```

### **Use Cases**
- **Dynamic Content Optimization** - Switch content based on crowd size and engagement
- **Revenue Optimization** - Maximize ad revenue with targeted content delivery
- **Safety & Crowd Management** - Detect crowd surges and unusual patterns
- **Audience Insights** - Real-time analytics for advertising performance

### **Privacy & Compliance**
- ✅ **No Facial Recognition** - Hardware incapable, never implemented
- ✅ **Anonymous Data Only** - No personal identifiers collected
- ✅ **Edge AI Processing** - All inference runs locally on device
- ✅ **GDPR/CCPA Compliant** - Built-in privacy controls and consent management

**Learn More**: [LiDAR Extension Documentation](./extensions/billboard-lidar/README.md)

## �🔐 **Privacy-First Design**

- **Anonymous by default** - Uses `anon-{uuid}` identifiers
- **No PII collection** - Personal data never tracked
- **GDPR/CCPA compliant** - Built-in consent management
- **Client-side storage** - Data stays local until sync
- **TTL enforcement** - Automatic data expiration
- **Opt-out API** - Users control their privacy

## ⚡ **Quick Start Examples**

### Web (Automatic Everything)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Auto-initialize via meta tag -->
  <meta name="vibemesh-api-key" content="your-api-key">
  <script src="https://cdn.vibemesh.io/v1/vibemesh.min.js"></script>
</head>
<body>
  <!-- All clicks, forms, videos automatically tracked -->
  <button>Add to Cart</button> <!-- Tracked as e-commerce event -->
  <form><input type="search" placeholder="Search..."></form> <!-- Auto search tracking -->
  <video src="demo.mp4"></video> <!-- Video engagement tracked -->
</body>
</html>
```

### React Native (Zero Configuration)
```jsx
import VibeMesh from '@vibemesh/react-native-sdk';

// Initialize once in App.js
await VibeMesh.init({ clientId: 'your-api-key' });

// All screens and interactions automatically tracked
export default function ProductScreen({ productId }) {
  return (
    <ScrollView> {/* Scroll depth tracked */}
      <TouchableOpacity> {/* Tap automatically tracked */}
        <Text>Add to Cart</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

### iOS Native (Swizzled Auto-Tracking)
```swift
import VibeMesh

// AppDelegate.swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let config = VibeMesh.Configuration(
        apiKey: "your-api-key",
        enableAutoTracking: true
    )
    
    Task {
        try await VibeMesh.shared.initialize(config: config)
    }
    
    return true
}

// All ViewControllers and UIButton taps automatically tracked
class ProductViewController: UIViewController {
    // Screen view automatically tracked when viewDidAppear is called
    // Button taps automatically tracked via swizzling
}
```

### Android Native (Lifecycle Auto-Tracking)
```kotlin
import io.vibemesh.sdk.VibeMesh

// Application.kt
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        lifecycleScope.launch {
            val config = VibeMesh.Configuration(
                apiKey = "your-api-key",
                enableAutoTracking = true
            )
            
            VibeMesh.instance.initialize(this@MyApplication, config)
        }
    }
}

// All Activities and Button clicks automatically tracked
class ProductActivity : AppCompatActivity() {
    // Screen views automatically tracked via activity lifecycle
    // Button clicks automatically tracked via click listeners
}
```

## 📊 **Automatic Event Types**

### Web Auto-Tracking
| Event Type | Triggered When | Data Captured |
|------------|----------------|---------------|
| `page_view` | Page loads, SPA navigation | URL, title, referrer, viewport |
| `click` | Any element clicked | Element info, coordinates, modifiers |
| `scroll_depth` | 25%, 50%, 75%, 100% scrolled | Percentage, timing, page height |
| `form_interaction` | Form submitted/focused | Form structure (no values) |
| `video_interaction` | Play/pause/milestone | Duration, position, milestones |
| `download` | File download links | File type, name, source |
| `search` | Search forms/inputs | Query (anonymized) |
| `add_to_cart` | E-commerce patterns | Product info from DOM |
| `javascript_error` | Unhandled errors | Error details for debugging |
| `page_performance` | Load complete | Timing metrics |

### Mobile Auto-Tracking
| Event Type | Platform | Triggered When | Data Captured |
|------------|----------|----------------|---------------|
| `screen_view` | Both | Screen/Activity shown | Screen name, class, timing |
| `button_tap` | Both | Button/TouchableOpacity pressed | Button text, screen context |
| `app_foreground` | Both | App becomes active | Session info, duration |
| `app_background` | Both | App goes to background | Session duration |
| `gesture` | React Native | Swipe, pinch, long press | Gesture type, coordinates |
| `navigation` | React Native | Screen navigation | From/to screens, params |
| `text_input` | React Native | TextInput interactions | Input type, length (no content) |

### Node.js/DOOH Auto-Tracking
| Event Type | Triggered When | Data Captured |
|------------|----------------|---------------|
| `billboard_impression` | Content displayed | Duration, content ID, location |
| `dwell_time` | Presence detected | Duration, time of day |
| `content_rotation` | Content changes | Previous/next content, timing |
| `system_health` | Periodic health check | CPU, memory, storage, network |

## 🛠 **Manual Tracking (When Needed)**

For custom business events, use the manual tracking API:

```javascript
// High-level convenience methods (all platforms)
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

// Custom events with your own data
await VibeMesh.track('venue_view', {
  venue_id: 'venue_123',
  venue_name: 'Blue Note',
  category: 'jazz_club'
});
```

## 🎯 **Platform-Specific Features**

### Enhanced Web Tracking
```javascript
VibeMesh.init({
  clientId: 'your-api-key',
  autoTracking: {
    pageViews: true,         // SPA navigation
    clicks: true,            // All clicks with context
    scrollDepth: true,       // Engagement depth
    formSubmits: true,       // Form completion
    videoInteractions: true, // Media engagement
    downloads: true,         // File downloads
    linkClicks: true,        // External links
    errorTracking: true,     // JavaScript errors
    performanceTracking: true, // Load times
    searchTracking: true,    // Search behavior
    ecommerce: true          // Shopping patterns
  }
});
```

### React Native Capabilities
```jsx
// Automatic gesture tracking
<PanGestureHandler> {/* Tracked automatically */}
  <PinchGestureHandler> {/* Multi-touch tracked */}
    <TapGestureHandler> {/* All gestures captured */}
      <AnimatedView />
    </TapGestureHandler>
  </PinchGestureHandler>
</PanGestureHandler>

// Navigation auto-tracking
import { NavigationContainer } from '@react-navigation/native';

<NavigationContainer
  onStateChange={(state) => {
    // Automatically tracked by VibeMesh
  }}
>
  <Stack.Navigator>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Product" component={ProductScreen} />
  </Stack.Navigator>
</NavigationContainer>
```

### iOS Advanced Features
```swift
// Automatic location context (with permission)
let config = VibeMesh.Configuration(
    apiKey: "your-api-key",
    enableGeolocation: true,    // Adds location to events
    enableAutoTracking: true,   // UIKit swizzling
    debugMode: true            // Console logging
)

// Custom UTM tracking
await VibeMesh.shared.track("campaign_view", context: [
    "utm_source": "instagram",
    "utm_campaign": "summer_sale",
    "utm_medium": "social"
])
```

### Android Advanced Features
```kotlin
val config = VibeMesh.Configuration(
    apiKey = "your-api-key",
    enableGeolocation = true,   // Location context
    enableAutoTracking = true,  // Activity/Fragment tracking
    batchSize = 50,            // Network optimization
    flushInterval = 30000L     // 30 second sync
)

// Fragment auto-tracking
class ProductFragment : Fragment() {
    // onResume automatically tracked
    // Button clicks automatically tracked via view tree
}
```

## 📈 **Data Format & Pipeline**

All events follow a standardized format across platforms:

```json
{
  "event_id": "evt_123",
  "event_type": "screen_view",
  "entity_id": "product_456",
  "timestamp": "2024-01-01T12:00:00Z",
  "uuid": "anon-abc123",
  "session_id": "ses_789",
  "client_id": "your-api-key",
  "platform": "ios",
  "context": {
    "screen_name": "ProductViewController",
    "product_id": "prod_123",
    "category": "electronics"
  },
  "geo_context": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 100
  },
  "tags": ["mobile", "product"],
  "ttl": 15552000
}
```

### Event Pipeline
```
Mobile/Web App → VibeMesh SDK → Local Storage → Batch Upload → API Gateway → 
Lambda → Kinesis → S3/DynamoDB → Analytics Dashboard
```

## 🔧 **Installation**

### Web
```bash
# NPM
npm install @vibemesh/web-sdk

# CDN
<script src="https://cdn.vibemesh.io/v1/vibemesh.min.js"></script>

# Auto-initialize via meta tag
<meta name="vibemesh-api-key" content="your-api-key">
```

### React Native
```bash
npm install @vibemesh/react-native-sdk
cd ios && pod install  # iOS only
```

### iOS
```ruby
# CocoaPods
pod 'VibeMesh', '~> 1.0'

# Swift Package Manager
.package(url: "https://github.com/vibemesh/universal-sdk", from: "1.0.0")
```

### Android
```gradle
// build.gradle (app)
implementation 'io.vibemesh:vibemesh-android:1.0.0'
```

### Node.js
```bash
npm install @vibemesh/node-sdk
```

## 🏗 **Architecture**

```
┌─────────────────────────────────────────────────────┐
│                VibeMesh Universal SDK                │
├─────────────────────────────────────────────────────┤
│  📱 Mobile (iOS/Android)    🌐 Web     🖥 Node.js    │
│  • Auto screen tracking   • Auto clicks  • System   │
│  • Gesture detection      • Form events  • Billboard │
│  • App lifecycle          • Video/media  • Health    │
│  • Location context       • E-commerce   • Content   │
├─────────────────────────────────────────────────────┤
│                  Core Features                      │
│  • Anonymous UUIDs        • Offline Storage         │
│  • Event Batching         • TTL Management          │
│  • Privacy Controls       • Network Retry           │
│  • Geo-aware (opt-in)     • Error Handling          │
├─────────────────────────────────────────────────────┤
│                 Platform Adapters                   │
│  • Storage: localStorage, AsyncStorage, UserDefaults│
│  • Network: fetch, XMLHttpRequest, URLSession       │
│  • Lifecycle: DOM events, AppState, UIApplication   │
└─────────────────────────────────────────────────────┘
```

## 🎮 **Demo Apps**

Try the SDK immediately:

```bash
# Web demo
cd examples/web && open index.html

# React Native demo
cd examples/react-native && npm start

# iOS demo
cd examples/ios && open VibeMeshExample.xcodeproj

# Android demo
cd examples/android && ./gradlew assembleDebug
```

## 📚 **Migration Guide**

### From OnCabaret Integration
The Universal SDK is a drop-in replacement with enhanced capabilities:

```javascript
// Old OnCabaret integration
OnCabaret.trackVenueView(venueId, venueName);

// New VibeMesh (automatically tracks + manual option)
await VibeMesh.track('venue_view', {
  venue_id: venueId,
  venue_name: venueName,
  // Auto-added: timestamp, user_id, session_id, geo_context
});
```

### From Google Analytics
```javascript
// Old GA4
gtag('event', 'purchase', {
  transaction_id: '123',
  value: 29.99,
  currency: 'USD'
});

// VibeMesh (privacy-first)
await VibeMesh.trackPurchase({
  transactionId: '123',
  amount: 29.99,
  currency: 'USD'
  // No user identification, anonymous by default
});
```

## 🛡 **Privacy & Compliance**

- **Anonymous-first**: No emails, names, or PII
- **User control**: Built-in opt-out mechanisms
- **Data minimization**: Only collect what's needed
- **Geographic compliance**: GDPR, CCPA, PIPEDA support
- **Retention policies**: Configurable TTL per event type
- **Encryption**: HTTPS/TLS for all data transmission

## 🚀 **Performance**

| Platform | Bundle Size | Init Time | Memory | Battery Impact |
|----------|-------------|-----------|--------|----------------|
| Web | 2.3KB gzipped | <50ms | <1MB | Negligible |
| React Native | 45KB | <100ms | <5MB | Very Low |
| iOS | 180KB | <200ms | <3MB | Low |
| Android | 220KB | <150ms | <4MB | Low |

## 📞 **Support**

- **Documentation**: [docs.vibemesh.io](https://docs.vibemesh.io)
- **API Reference**: [api.vibemesh.io](https://api.vibemesh.io)
- **Examples**: [github.com/vibemesh/examples](https://github.com/vibemesh/examples)
- **Support**: [support@vibemesh.io](mailto:support@vibemesh.io)

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**VibeMesh Universal SDK** - Privacy-first analytics that just works. Initialize once, track everything automatically. 🚀