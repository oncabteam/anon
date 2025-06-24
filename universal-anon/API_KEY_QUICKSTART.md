# 🎯 Anonymous Intent SDK - API Key Quickstart

**Get intelligent user insights in minutes with just an API key.**

The OnCabaret Anonymous Intent SDK is the world's first privacy-first analytics platform that provides real-time behavioral insights without collecting any personally identifiable information. Simply integrate with your API key and start receiving advanced ML-powered analytics immediately.

## 🚀 Get Started in 5 Minutes

### Step 1: Get Your API Key

Request your API key at https://oncabaret.com/anonymous-intent-sdk

- **Trial**: 1,000 events/hour, 14-day free trial
- **Basic**: 10,000 events/hour, clustering insights
- **Pro**: 100,000 events/hour, advanced ML features
- **Enterprise**: Unlimited events, custom models

### Step 2: Choose Your Platform

<table>
<tr>
<td width="50%">

**Web/JavaScript**
```javascript
// Install via npm
npm install @oncabaret/anon-intent-sdk

// Initialize with your API key
import AnonSDK from '@oncabaret/anon-intent-sdk';

const anonSDK = new AnonSDK({
  apiKey: 'your-api-key-here',
  environment: 'production'
});

// Start tracking - that's it!
anonSDK.track('page_view', {
  page_url: window.location.href,
  page_title: document.title
});
```

</td>
<td width="50%">

**React Native**
```javascript
// Install via npm
npm install @oncabaret/anon-intent-react-native

// Initialize in your App.js
import AnonSDK from '@oncabaret/anon-intent-react-native';

const anonSDK = new AnonSDK({
  apiKey: 'your-api-key-here',
  environment: 'production'
});

// Track user interactions
anonSDK.track('venue_view', {
  venue_id: 'venue_123',
  category: 'restaurant'
});
```

</td>
</tr>
<tr>
<td>

**iOS (Swift)**
```swift
// Add to Package.swift
.package(url: "https://github.com/oncabaret/anon-intent-ios", from: "1.0.0")

// Initialize in AppDelegate
import AnonIntentSDK

let anonSDK = AnonSDK(
  apiKey: "your-api-key-here",
  environment: .production
)

// Track events
anonSDK.track("content_view", properties: [
  "content_id": "article_123",
  "content_type": "article"
])
```

</td>
<td>

**Android (Kotlin)**
```kotlin
// Add to build.gradle
implementation 'com.oncabaret:anon-intent-android:1.0.0'

// Initialize in Application class
import com.oncabaret.anon.intent.sdk.AnonSDK

val anonSDK = AnonSDK.Builder(this)
  .apiKey("your-api-key-here")
  .environment(Environment.PRODUCTION)
  .build()

// Track events
anonSDK.track("product_view", mapOf(
  "product_id" to "prod_123",
  "category" to "electronics"
))
```

</td>
</tr>
</table>

### Step 3: Get Instant Insights

**That's it!** Your dashboard is automatically populated with:

- 🔥 **Real-time user behavior analytics**
- 🧠 **ML-powered intent scoring**
- 👥 **Automatic user clustering**
- 📊 **Cross-platform insights**
- 🛡️ **100% privacy compliant**

## 📊 What You Get Immediately

### Real-Time Analytics Dashboard
```
┌─── Live Metrics ──────────────────────────────┐
│ 🔥 Events/min: 142        📱 Active Sessions: 87 │
│ 👥 Unique Users: 234      ⏱️  Avg Session: 3:42   │
│ 🎯 Intent Score: 72%      📈 Engagement: +15%    │
└───────────────────────────────────────────────┘

┌─── User Behavior Clusters ───────────────────┐
│ 🛍️  High-Intent Shoppers (23%)              │
│ 🔍 Research Browsers (41%)                   │
│ ⚡ Quick Visitors (28%)                      │
│ 🤔 Undecided Users (8%)                     │
└───────────────────────────────────────────────┘
```

### Advanced ML-Powered Insights

**🎯 Intent Prediction**
```json
{
  "anon_id": "anon-user-abc123",
  "intent_scores": {
    "purchase_intent": 0.82,
    "browse_intent": 0.61,
    "compare_intent": 0.45,
    "exit_intent": 0.12
  },
  "recommendations": [
    "High purchase intent - show relevant offers",
    "User in price-sensitive cluster"
  ]
}
```

**🧠 Behavioral Clustering**
```json
{
  "cluster_assignment": {
    "cluster_id": "high_value_browsers",
    "confidence": 0.89,
    "characteristics": {
      "avg_session_duration": 380,
      "scroll_engagement": 0.76,
      "form_interaction_rate": 0.23
    }
  }
}
```

## 🔥 Auto-Tracking Features

The SDK automatically captures intelligent behavioral signals:

### Web Auto-Tracking
- ✅ **Page views** with scroll depth analysis
- ✅ **Click patterns** with velocity detection
- ✅ **Form interactions** with abandonment tracking
- ✅ **Download tracking** and external link clicks
- ✅ **Media engagement** (video/audio interactions)
- ✅ **Exit intent** detection

### Mobile Auto-Tracking
- ✅ **Screen views** with engagement scoring
- ✅ **App lifecycle** events (background/foreground)
- ✅ **Gesture tracking** (taps, swipes, long-press)
- ✅ **Location patterns** (anonymized to ~1km)
- ✅ **Push notification** interactions
- ✅ **Deep link** attribution

## 🛡️ Privacy-First by Design

### Anonymous by Default
```javascript
// Everything is anonymous - no PII ever collected
{
  "anon_id": "anon-e8f2c9a1b3d4",  // Anonymous UUID
  "session_id": "sess-x9y8z7w6",    // Session identifier
  "geo": {
    "lat": 37.7749,    // Anonymized to ~1km precision
    "lng": -122.4194,  // No exact location tracking
    "accuracy": 1000   // Precision indicator
  },
  "device_meta": {
    "platform": "web",           // General platform only
    "browser": "chrome",         // Browser type only
    "viewport": "1920x1080"      // Display info only
  }
  // No emails, names, IPs, or personal data!
}
```

### Consent Management
```javascript
// Built-in GDPR/CCPA compliance
anonSDK.setConsent({
  analytics: true,
  personalization: false,
  marketing: false
});

// Automatic data deletion
anonSDK.requestDataDeletion(); // Removes all user data
```

## 🔧 Advanced Configuration

### Custom Event Tracking
```javascript
// Track business-specific events
anonSDK.track('purchase_intent', {
  product_category: 'electronics',
  price_range: '500-1000',
  comparison_count: 3
});

anonSDK.track('content_engagement', {
  content_type: 'article',
  read_percentage: 75,
  time_spent: 180
});
```

### Real-Time API Access
```javascript
// Get live insights for any user
const insights = await anonSDK.getUserInsights('anon-user-id');
console.log(insights);
```

### Dashboard Integration
```javascript
// Embed real-time dashboard
<iframe 
  src="https://dashboard.oncabaret.com/embed?api_key=your-key"
  width="100%" 
  height="600"
/>
```

## 📈 Performance & Scale

### Lightning Fast
- ⚡ **<100ms** event processing latency
- 🚀 **<5ms** intent score prediction
- 📊 **Real-time** dashboard updates
- 🔄 **Offline support** with auto-sync

### Enterprise Scale
- 🌐 **1M+ events/hour** processing capacity
- 🏗️ **Auto-scaling** AWS infrastructure
- 💾 **99.9% uptime** SLA
- 🔐 **SOC2 compliant** security

### Global Edge Network
- 🌍 **Multi-region** deployment
- 📡 **CDN-powered** SDK delivery
- 🔄 **Automatic failover**
- 📊 **Regional data residency**

## 🎯 Use Cases & Examples

### E-commerce
```javascript
// Track shopping behavior
anonSDK.track('product_view', {
  product_id: 'prod_123',
  category: 'electronics',
  price: 299.99
});

// Get purchase intent prediction
const intent = await anonSDK.getPurchaseIntent('anon-user-id');
// Returns: { score: 0.83, confidence: 0.91 }
```

### Content Publishing
```javascript
// Track content engagement
anonSDK.track('article_read', {
  article_id: 'art_456',
  read_percentage: 80,
  reading_speed: 'slow'
});

// Get content recommendations
const recs = await anonSDK.getContentRecommendations('anon-user-id');
```

### SaaS Applications
```javascript
// Track feature usage
anonSDK.track('feature_interaction', {
  feature_name: 'analytics_dashboard',
  interaction_type: 'click',
  session_context: 'onboarding'
});

// Get churn prediction
const churn = await anonSDK.getChurnPrediction('anon-user-id');
```

## 📊 Dashboard Features

### Real-Time Analytics
- 📈 **Live metrics** with 1-second updates
- 🗺️ **Geographic heatmaps** (anonymized)
- 📱 **Platform breakdown** (web, mobile, app)
- ⏱️ **Time-series analysis** with drill-down

### ML Insights
- 🧠 **Behavior clustering** with automatic labeling
- 🎯 **Intent scoring** across multiple dimensions
- 📊 **Feature importance** analysis
- 🔮 **Predictive modeling** results

### Export & Integration
- 📤 **CSV/JSON exports** for further analysis
- 🔌 **Webhook integration** for real-time alerts
- 📊 **API access** for custom dashboards
- 🔄 **Data pipeline** integration

## 🛠️ API Reference

### Core Methods
```javascript
// Initialize SDK
const sdk = new AnonSDK({ apiKey: 'your-key' });

// Track events
sdk.track(eventName, properties);

// Get user insights
await sdk.getUserInsights(anonId);

// Get dashboard data
await sdk.getDashboardData(timeRange);

// Manage consent
sdk.setConsent(consentOptions);
```

### REST API Endpoints
```bash
# Event ingestion
POST https://api.oncabaret.com/v1/events
Headers: X-API-Key: your-api-key

# User insights
GET https://api.oncabaret.com/v1/insights?anon_id=user123

# Real-time dashboard
GET https://api.oncabaret.com/v1/dashboard?time_window=1h

# Intent prediction
GET https://api.oncabaret.com/v1/intent/predict?anon_id=user123
```

## 🔧 Infrastructure

### Automatic Provisioning
When you get your API key, we automatically provision:

- 🗄️ **DynamoDB tables** for your data
- 🚰 **Kinesis streams** for real-time processing
- 🧠 **ML models** trained on your data patterns
- 💾 **Redis cache** for fast lookups
- 📊 **Dashboard instance** with your branding

### Zero Configuration Required
- ❌ No database setup
- ❌ No server management
- ❌ No ML model training
- ❌ No infrastructure costs
- ✅ **Just add your API key and go!**

## 💡 Best Practices

### Event Design
```javascript
// Good: Descriptive and structured
anonSDK.track('product_add_to_cart', {
  product_id: 'prod_123',
  category: 'electronics',
  price: 299.99,
  discount_applied: true
});

// Avoid: Generic or unstructured
anonSDK.track('click', { target: 'button' });
```

### Privacy Compliance
```javascript
// Always respect user consent
if (userConsent.analytics) {
  anonSDK.track('page_view', pageData);
}

// Provide data deletion
anonSDK.on('deletion_request', (anonId) => {
  anonSDK.deleteUserData(anonId);
});
```

### Performance Optimization
```javascript
// Batch events for better performance
anonSDK.batchTrack([
  { event: 'page_view', properties: {...} },
  { event: 'scroll_depth', properties: {...} },
  { event: 'click', properties: {...} }
]);

// Use offline storage for reliability
anonSDK.enableOfflineStorage(true);
```

## 📞 Support & Resources

### Documentation
- 📚 **[Complete API Docs](https://docs.oncabaret.com/anon-intent-sdk)**
- 🎓 **[Implementation Guides](https://docs.oncabaret.com/guides)**
- 💡 **[Best Practices](https://docs.oncabaret.com/best-practices)**
- 🔧 **[Troubleshooting](https://docs.oncabaret.com/troubleshooting)**

### Community
- 💬 **[Discord Community](https://discord.gg/oncabaret)**
- 📧 **[Email Support](mailto:support@oncabaret.com)**
- 🐛 **[GitHub Issues](https://github.com/oncabaret/anon-intent-sdk/issues)**
- 📱 **[Status Page](https://status.oncabaret.com)**

### Enterprise Support
- 🏢 **Dedicated account manager**
- 🔧 **Custom integration support**
- 📊 **Advanced analytics consulting**
- 🛡️ **Security & compliance review**

---

## 🚀 Start Building Today

1. **[Get Your API Key](https://oncabaret.com/anonymous-intent-sdk/signup)**
2. **[View Live Demo](https://demo.oncabaret.com/anon-intent)**
3. **[Read the Docs](https://docs.oncabaret.com)**

**Ready to understand your users without compromising their privacy?**

```bash
npm install @oncabaret/anon-intent-sdk
```

🎯 **Anonymous Intent SDK - Privacy-first analytics that actually work.**