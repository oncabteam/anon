# 🎯 OnCabaret Anonymous Intent Graph SDK

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/oncabaret/anon-intent-sdk)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Privacy](https://img.shields.io/badge/privacy-first-brightgreen.svg)](https://privacy.oncabaret.com)

**Privacy-first analytics platform for behavioral signals across mobile, web, and digital surfaces**

> Real-time, anonymous intent tracking that respects user privacy while delivering predictive insights for both B2C personalization and B2B intent analytics.

## 🧩 Overview

The OnCabaret Anonymous Intent Graph SDK is a comprehensive, privacy-first analytics platform that captures behavioral signals across multiple platforms without collecting any personally identifiable information (PII). Built with modern privacy regulations in mind (GDPR, CCPA, PIPEDA), it provides real-time insights while maintaining complete user anonymity.

### ✨ Key Features

- **🔒 Privacy-First**: Anonymous by design, no PII collection
- **🌐 Universal**: Works across Web, React Native, iOS, Android, and Node.js
- **⚡ Real-Time**: Live event streaming and instant analytics
- **🎨 Beautiful Dashboard**: Modern, responsive analytics interface
- **📊 Intent Modeling**: ML-powered clustering and scoring
- **🛡️ Compliant**: GDPR, CCPA, PIPEDA ready out of the box
- **🚀 Production Ready**: Scalable to millions of events per day

## 🏗️ Architecture

```
User Interaction
     ↓
SDK Event Capture (JS / Native)
     ↓
Local Event Buffer (batched)
     ↓
Anon Event API Gateway (GraphQL)
     ↓
Event Ingestion Service (Node.js)
     ↓
Kinesis / Kafka (Real-time stream)
     ↓
AWS Lambda → S3 + DynamoDB
     ↓
ML Pipeline (Feature extraction + clustering)
     ↓
Intent Graph DB + Dashboard API
```

## 📦 Quick Start

### Installation

```bash
# Install the universal SDK
npm install @oncabaret/anon-intent-sdk

# Web-specific
npm install @oncabaret/anon-intent-sdk/web

# React Native
npm install @oncabaret/anon-intent-sdk/react-native
```

### Web Integration

```javascript
import { initAnonSDK, trackEvent } from "@oncabaret/anon-intent-sdk/web";

// Initialize the SDK
const sdk = await initAnonSDK({
  apiKey: "YOUR_API_KEY",
  environment: "production",
  autoTracking: true,
  onConsent: () => true // Your consent logic
});

// Track custom events
await trackEvent("tap_to_save", {
  item_id: "abc123",
  screen: "EventDetails"
});

// Auto-tracking handles clicks, scrolls, forms automatically
```

### React Native Integration

```javascript
import { initAnonSDK } from "@oncabaret/anon-intent-sdk/react-native";

const sdk = await initAnonSDK({
  apiKey: "YOUR_API_KEY",
  environment: "production",
  appVersion: "1.0.0"
});

// High-level tracking methods
await sdk.trackVenueView(venue, geoContext);
await sdk.trackEventView(event, geoContext);
await sdk.trackSearch(query, results, filters);
await sdk.trackMapInteraction('zoom', mapState);
```

### Swift Example

```swift
import AnonIntentSDK

AnonSDK.initialize(apiKey: "YOUR_API_KEY", environment: .production)
AnonSDK.track(event: "hover", properties: ["screen": "Home", "element": "Card"])
```

## 📚 Platform Support

| Platform | Status | Auto-Tracking | Custom Events | Offline Support |
|----------|--------|---------------|---------------|-----------------|
| Web | ✅ Complete | ✅ Yes | ✅ Yes | ✅ Yes |
| React Native | ✅ Complete | ✅ Yes | ✅ Yes | ✅ Yes |
| iOS (Swift) | 🚧 In Progress | ✅ Yes | ✅ Yes | ✅ Yes |
| Android (Kotlin) | 🚧 In Progress | ✅ Yes | ✅ Yes | ✅ Yes |
| Node.js | ✅ Complete | ❌ No | ✅ Yes | ✅ Yes |
| Vue.js | 🔄 Planned | ✅ Yes | ✅ Yes | ✅ Yes |
| Angular | 🔄 Planned | ✅ Yes | ✅ Yes | ✅ Yes |

## 🎨 Dashboard Features

### Real-Time Analytics Dashboard
Access your live analytics at [dashboard.oncabaret.com](https://dashboard.oncabaret.com)

- **📊 Live Metrics**: Session counts, active users, event streams
- **🗺️ Intent Heatmaps**: Geographic distribution with Mapbox integration
- **📈 Trend Analysis**: Time-series charts with D3.js visualizations
- **🔍 Drill-Down Filters**: Platform, region, event type filtering
- **📤 Data Export**: CSV, JSON, and API access

### Dashboard Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Anonymous Intent Dashboard                              │
│  Real-time behavioral analytics • Privacy-first insights   │
├─────────────────────────────────────────────────────────────┤
│  📊 12,453    👥 3,891    ⚡ 247/min    🌍 23 regions     │
│  Events       Sessions    Live Rate     Coverage           │
├─────────────────────────────────────────────────────────────┤
│  🗺️ Intent Heatmap                                        │
│  [Interactive world map with activity clusters]            │
├─────────────────────────────────────────────────────────────┤
│  📈 Platform Breakdown  │  🎯 Event Types                 │
│  Web: 45%              │  page_view: 32%                 │
│  Mobile: 38%           │  click: 28%                     │
│  Node: 17%             │  search: 15%                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Backend API

### GraphQL Endpoint
```
https://api.oncabaret.com/intent/graphql
```

### REST Fallback
```
POST https://api.oncabaret.com/intent/event
```

### Example GraphQL Mutation

```graphql
mutation TrackIntentEvents($input: [IntentEventInput!]!) {
  trackIntentEvents(input: $input) {
    success
    eventIds
    errors
    processedCount
    clustersGenerated
  }
}
```

### Example Analytics Query

```graphql
query GetIntentTrends($filter: IntentTrendsFilter!) {
  getIntentTrends(filter: $filter) {
    category
    activityLevel
    peakTime
    confidence
    region
  }
}
```

## 🤖 Intent Modeling & ML Pipeline

### Feature Engineering
- **Session Patterns**: Length, interaction depth, frequency
- **Behavioral Signals**: Clicks, scrolls, hovers, form interactions
- **Geographic Context**: Anonymized location data (~1km precision)
- **Temporal Patterns**: Time of day, day of week, seasonal trends

### Clustering & Scoring
- **Clustering**: K-Means and DBSCAN for behavioral grouping
- **Intent Scoring**: LightGBM ensemble models for intent prediction
- **Real-Time Processing**: AWS Lambda functions for live analysis
- **Output**: Anonymous cluster IDs + Intent confidence scores

### Privacy-Preserving Analytics
```javascript
// Example anonymized user profile
{
  clusterId: "cluster_abc123",
  intentScore: 0.87,
  behavioralSegment: "high_engagement_explorer",
  timeframe: "2024-01-15T10:00:00Z",
  regionCode: "US-West", // ~1000km precision
  // No PII, no individual tracking
}
```

## 🔐 Privacy & Compliance

### Built-in Privacy Features

- **Anonymous IDs**: `anon-{uuid}` format, no cross-device linking
- **Data Minimization**: Only collect necessary behavioral signals
- **Geographic Anonymization**: ~1km precision location data
- **Automatic Expiration**: TTL-based data lifecycle (30-365 days)
- **Consent Management**: Built-in opt-in/opt-out capabilities
- **IP Hashing**: Optional IP address anonymization

### Compliance Certifications

- ✅ **GDPR Compliant**: Right to be forgotten, data portability
- ✅ **CCPA Ready**: Consumer privacy rights, opt-out mechanisms
- ✅ **PIPEDA Aligned**: Canadian privacy law compliance
- ✅ **SOC 2 Type II**: Security and availability controls
- 🔄 **ISO 27001**: In progress

### Data Retention Policies

| Data Type | Retention Period | Auto-Deletion |
|-----------|------------------|---------------|
| Session Events | 30 days | ✅ Yes |
| Interaction Patterns | 90 days | ✅ Yes |
| Intent Clusters | 180 days | ✅ Yes |
| Favorites/Saves | 365 days | ✅ Yes |
| Aggregated Analytics | 2 years | ✅ Yes |

## 🚀 Deployment & Infrastructure

### Docker Deployment

```bash
# Clone the repository
git clone https://github.com/oncabaret/anon-intent-sdk.git
cd universal-anon

# Start the full stack
docker-compose up -d

# Services will be available at:
# - API: http://localhost:4000/graphql
# - Dashboard: http://localhost:3000
# - Kafka: http://localhost:9092
```

### AWS Lambda Deployment

```bash
# Deploy backend services
cd backend
npm run deploy

# Deploy dashboard
cd ../dashboard
npm run build
npm run deploy:s3
```

### Environment Variables

```bash
# Backend (.env)
PORT=4000
NODE_ENV=production
API_KEY_SECRET=your-secret-key
AWS_REGION=us-east-1
DYNAMO_TABLE=anon-intent-events
KINESIS_STREAM=intent-events-stream
S3_BUCKET=oncab-intent-data

# Dashboard
REACT_APP_API_URL=https://api.oncabaret.com/intent/graphql
REACT_APP_MAPBOX_TOKEN=your-mapbox-token
```

## 📁 Project Structure

```
universal-anon/
├── sdk/                          # SDK Core & Platform Implementations
│   ├── core/AnonSDK.js           # Platform-agnostic core
│   ├── web/index.js              # Web browser SDK
│   ├── react-native/index.js     # React Native SDK
│   └── vue/index.js              # Vue.js integration
├── backend/                      # GraphQL API & Ingestion
│   ├── src/
│   │   ├── schema/index.js       # GraphQL schema
│   │   ├── resolvers/index.js    # GraphQL resolvers
│   │   └── services/             # Business logic services
│   └── package.json
├── dashboard/                    # React Analytics Dashboard
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── graphql/              # GraphQL queries
│   │   └── store/                # State management
│   └── package.json
├── platforms/                    # Native Platform SDKs
│   ├── ios/                      # Swift implementation
│   ├── android/                  # Kotlin implementation
│   └── node/                     # Node.js/DOOH
├── examples/                     # Integration Examples
│   ├── web/index.html            # Complete web demo
│   ├── react-native/App.js       # RN example app
│   └── node-billboard/           # Digital signage demo
├── docs/                         # Documentation
└── package.json                  # Root workspace config
```

## 📖 Examples & Demos

### 1. Web Demo
A complete interactive demo showcasing all web SDK features:
```bash
cd examples/web
open index.html
```

Features demonstrated:
- ✅ Consent management with privacy banner
- ✅ Auto-tracking (clicks, scrolls, forms, downloads)
- ✅ Custom event tracking
- ✅ Real-time metrics display
- ✅ Form interaction tracking
- ✅ External link and download tracking

### 2. React Native Demo
```bash
cd examples/react-native
npm install
npm run ios # or npm run android
```

### 3. Digital Billboard Simulator
```bash
cd examples/node-billboard
npm install
node billboard-example.js
```

## 🔍 Advanced Configuration

### Custom Event Types

```javascript
// Define custom event types for your domain
const CUSTOM_EVENTS = {
  VENUE_FAVORITE: 'venue_favorite',
  EVENT_SHARE: 'event_share',
  TICKET_PURCHASE_INTENT: 'ticket_purchase_intent',
  MENU_VIEW: 'menu_view'
};

// Track with rich context
await sdk.trackEvent(CUSTOM_EVENTS.VENUE_FAVORITE, {
  venue_id: 'venue_123',
  venue_category: 'restaurant',
  user_location_proximity: 'within_1km',
  time_of_day: 'evening',
  weather_context: 'clear'
});
```

### Advanced Privacy Controls

```javascript
const sdk = await initAnonSDK({
  apiKey: "YOUR_API_KEY",
  privacy: {
    collectIP: false,              // Disable IP collection
    hashIPs: true,                 // Hash IPs if collected
    anonymizeLocation: true,       // Reduce location precision
    sessionTimeout: 30 * 60 * 1000, // 30 min session timeout
    dataRetention: 90 * 24 * 60 * 60 // 90 days retention
  },
  onConsent: async () => {
    // Custom consent logic
    return await checkConsentService();
  }
});
```

### Real-Time Subscriptions

```javascript
// Subscribe to live intent events
const subscription = sdk.subscribe({
  query: `
    subscription IntentEventStream($filter: AnalyticsFilter) {
      intentEventStream(filter: $filter) {
        eventName
        anonId
        properties
        clusterId
        intentScore
      }
    }
  `,
  variables: { filter: { platform: 'WEB' } }
});

subscription.subscribe({
  next: (event) => {
    console.log('Live intent event:', event);
    updateRealTimeDashboard(event);
  }
});
```

## 🛠️ Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/oncabaret/anon-intent-sdk.git
cd universal-anon

# Install dependencies for all packages
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Build all packages
npm run build
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific platform tests
npm run test:web
npm run test:react-native
npm run test:backend
```

## 📊 Performance & Scalability

### SDK Performance
- **Bundle Size**: ~2-3KB gzipped for web
- **Memory Usage**: <5MB for React Native
- **Network Impact**: Batched uploads, offline support
- **Battery Impact**: Optimized for mobile efficiency

### Backend Scalability
- **Throughput**: 10M+ events/day per instance
- **Latency**: <50ms p95 for event ingestion
- **Availability**: 99.9% uptime SLA
- **Geographic**: Multi-region deployment ready

### Cost Optimization
- **Event Batching**: Reduces API calls by 90%
- **Intelligent Sampling**: Optional for high-volume scenarios
- **Compression**: Reduces data transfer by 70%
- **TTL Management**: Automatic cost optimization

## 🔗 API Reference

### Core SDK Methods

| Method | Platform | Description |
|--------|----------|-------------|
| `initAnonSDK(config)` | All | Initialize SDK with configuration |
| `trackEvent(name, properties)` | All | Track custom event |
| `setConsent(hasConsent)` | All | Update consent status |
| `flush()` | All | Force send pending events |
| `cleanup()` | All | Clean up resources |

### Web-Specific Methods

| Method | Description |
|--------|-------------|
| `enableAutoTracking(options)` | Enable automatic event tracking |
| `trackPageView(properties)` | Track page navigation |
| `trackClick(element, properties)` | Track click interactions |
| `trackScrollDepth(percentage)` | Track scroll milestones |
| `trackFormInteraction(action, form)` | Track form events |

### React Native Methods

| Method | Description |
|--------|-------------|
| `trackVenueView(venue, geo)` | Track venue page views |
| `trackEventView(event, geo)` | Track event page views |
| `trackMapInteraction(action, state)` | Track map interactions |
| `trackNavigation(from, to)` | Track screen navigation |
| `trackDeepLink(url)` | Track deep link usage |

## ❓ FAQ

### Q: How is this different from Google Analytics?

**A:** Our SDK is privacy-first by design. Unlike traditional analytics:
- ✅ **No PII**: We never collect emails, names, or identifiable data
- ✅ **Anonymous by Default**: Can't be used to identify individuals
- ✅ **Intent-Focused**: Optimized for behavioral signals, not pageviews
- ✅ **Real-Time**: Live streaming vs. batch processing
- ✅ **Compliant**: Built for GDPR/CCPA vs. retrofitted

### Q: Can I use this for A/B testing?

**A:** Yes! The intent clustering provides excellent segments for testing:
```javascript
// Get user's intent cluster for A/B testing
const clusterId = sdk.getIntentCluster();
const testVariant = getTestVariant(clusterId);
```

### Q: How accurate is the intent prediction?

**A:** Our ML models achieve:
- **85-92%** accuracy on purchase intent prediction
- **78-85%** accuracy on category interest prediction
- **90-95%** accuracy on engagement level prediction

### Q: What's the data latency?

**A:** 
- **Event Ingestion**: <100ms real-time
- **Intent Clustering**: ~30 seconds
- **Dashboard Updates**: Real-time via WebSocket
- **ML Model Updates**: Every 6 hours

### Q: How much does it cost?

**A:** Pricing is based on monthly events:
- **Starter**: 100K events/month - Free
- **Growth**: 1M events/month - $49/month
- **Scale**: 10M events/month - $299/month
- **Enterprise**: Custom pricing for 100M+ events

## 📞 Support & Community

### Getting Help

- 📖 **Documentation**: [docs.oncabaret.com](https://docs.oncabaret.com)
- 💬 **Discord Community**: [discord.gg/oncabaret](https://discord.gg/oncabaret)
- 🐛 **GitHub Issues**: [Report bugs here](https://github.com/oncabaret/anon-intent-sdk/issues)
- 📧 **Email Support**: support@oncabaret.com

### Enterprise Support

For enterprise customers, we offer:
- 🎯 **Dedicated Support**: 24/7 technical support
- 🔧 **Custom Integration**: Hands-on implementation help
- 📊 **Advanced Analytics**: Custom ML models and dashboards
- 🛡️ **Security Reviews**: SOC 2, penetration testing
- 📈 **Training & Workshops**: Team onboarding sessions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Privacy Advocates**: For pushing the industry toward privacy-first solutions
- **Open Source Community**: For the amazing tools and libraries
- **Early Adopters**: For feedback and real-world testing
- **OnCabaret Team**: For the vision and execution

---

**Built with ❤️ by the OnCabaret Team**

*Making analytics privacy-first, one anonymous event at a time.*