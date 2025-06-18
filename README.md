# Anon Intent Graph SDK

## 🚀 Plug Into the Future of Anonymous Intent

**Capture and amplify real-time behavioral signals — on mobile, web, or billboards — without compromising privacy.**

[![Get SDK](https://img.shields.io/badge/Get%20SDK-blue?style=for-the-badge)](https://github.com/oncabaret/anon-sdk)
[![View Docs](https://img.shields.io/badge/View%20Docs-green?style=for-the-badge)](https://github.com/oncabteam/anon)
[![Talk to Sales](https://img.shields.io/badge/Talk%20to%20Sales-orange?style=for-the-badge)](mailto:sales-sdk+team@oncabaaret.com)

---

## 🎯 What is the Anon Intent Graph SDK?

The **Anon Intent Graph SDK** is a lightweight, cross-platform analytics and advertising intelligence layer designed for modern digital experiences. It seamlessly integrates into mobile apps, websites, and digital out-of-home (DOOH) systems to capture behavioral signals that power anonymous intent profiles.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Your App/Web  │    │   Anon Intent    │    │   OnCabaret Intent  │
│                 │───▶│      SDK         │───▶│      Engine         │
│  User Actions   │    │                  │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

### Key Features:
- **🔧 Cross-Platform**: Works on iOS, Android, JavaScript, and React Native
- **🔒 Privacy-First**: Zero PII collection, anonymized at source
- **⚡ Real-Time**: Instant behavioral pattern recognition
- **🎯 Intent-Focused**: Converts micro-interactions into actionable insights

### Behavioral Events Captured:
- **Touch Interactions**: clicks, hovers, swipes, zooms
- **Navigation Patterns**: page visits, scrolls, idle time
- **Engagement Actions**: tap-to-save, share, dismiss
- **Session Behavior**: depth, duration, flow patterns

> **Tech Note**: SDK events feed into OnCabaret's central intent engine, which matches micro-interactions to category-level interest clusters without exposing individual user data.

---

## 📊 Data Signals Captured

Our SDK enriches anonymous user profiles through multiple signal layers:

### 🔍 Core Signals
| Signal Type | Data Points | Privacy Level |
|-------------|-------------|---------------|
| **Device Metadata** | OS, time zone, browser/platform | Anonymous |
| **Location Context** | City-level GPS + IP geolocation | Aggregated |
| **Interaction Events** | Page flow, depth, session time | Behavioral |
| **Temporal Patterns** | Time-of-day, weekday/weekend usage | Contextual |

### 🧠 Enriched Intelligence
- **Demographic Inference**: Age range, income tier, lifestyle segments
- **Intent Modeling**: Discovered, returned, explored, shared behaviors
- **Real-Time Categorization**: Interest clusters and affinity scoring

```
Raw Events → Behavioral Patterns → Intent Clusters → Anonymous Profiles
    ↓              ↓                    ↓                 ↓
  Clicks         Session Flow       Category Interest    Audience Segment
  Swipes         Engagement Depth   Purchase Intent      Targeting Profile
  Scrolls        Retention Pattern  Content Affinity     Campaign Relevance
```

---

## 🎬 Use Cases by Surface

### 📱 Mobile Apps
- **In-App Advertising**: Contextual ad placement based on user behavior
- **Product Recommendations**: Intent-driven content suggestions
- **User Experience**: Personalized app flows and feature discovery
- **Retention Optimization**: Behavioral triggers for engagement campaigns

### 🌐 Websites
- **Programmatic Advertising**: Real-time audience targeting
- **Content Optimization**: Behavioral-driven content strategy
- **Conversion Optimization**: Intent-based funnel improvements
- **Publisher Monetization**: Enhanced audience data for ad exchanges

### 🏢 Digital Out-of-Home (DOOH)
- **Dynamic Creative**: Location + time-based content adaptation
- **Audience Measurement**: Anonymous foot traffic analysis
- **Campaign Attribution**: Cross-channel intent tracking
- **Programmatic DOOH**: Real-time bidding with behavioral context

### 🎯 Ad Exchanges & DSPs
- **Audience Enrichment**: Enhanced bidding data without PII
- **Lookalike Modeling**: Intent-based audience expansion
- **Attribution Modeling**: Cross-device behavioral tracking
- **Yield Optimization**: Behavioral signals for inventory pricing

---

## 🔒 Privacy & Compliance

### Privacy-First Architecture
- ✅ **Zero PII Collection**: No emails, names, or personal identifiers
- ✅ **Anonymized at Source**: All data processed through privacy-preserving algorithms
- ✅ **GDPR/CCPA Compatible**: Built-in compliance framework
- ✅ **Consent Management**: Configurable user consent prompts
- ✅ **Data Minimization**: Only behaviorally relevant signals captured

### Compliance Features
```javascript
// Example: Configurable consent
anonSDK.configure({
  consentRequired: true,
  consentPrompt: "Help improve your experience?",
  dataRetention: "30d",
  anonymizationLevel: "high"
});
```

---

## 🚀 Getting Started

### Quick Installation

#### React Native
```bash
npm install @oncabaret/anon-intent-sdk
```

```javascript
import { AnonSDK } from '@oncabaret/anon-intent-sdk';

AnonSDK.initialize({
  apiKey: 'your-api-key',
  environment: 'production'
});
```

#### iOS (Swift)
```swift
import AnonIntentSDK

AnonSDK.shared.initialize(apiKey: "your-api-key")
```

#### Android (Kotlin)
```kotlin
import com.oncabaret.anonintentsdk.AnonSDK

AnonSDK.initialize(context, "your-api-key")
```

#### JavaScript/Web
```html
<script src="https://cdn.oncabaret.com/anon-sdk/latest/anon-sdk.js"></script>
<script>
  AnonSDK.init('your-api-key');
</script>
```

### Integration Examples

#### Track Custom Events
```javascript
// Track specific user actions
AnonSDK.track('product_view', {
  category: 'electronics',
  price_range: '$100-500',
  session_depth: 3
});

// Track page navigation
AnonSDK.trackPageView('/product/smartphone', {
  referrer: 'search',
  time_on_page: 45
});
```

#### Behavioral Triggers
```javascript
// Set up behavioral triggers
AnonSDK.onIntent('high_purchase_intent', (segment) => {
  // Trigger personalized experience
  showRecommendations(segment.categories);
});
```

### Integration Partners
- **Analytics**: Amplitude, Segment, Google Analytics
- **Ad Platforms**: Google Ads, Facebook Ads, The Trade Desk
- **CRM**: Salesforce, HubSpot
- **CDP**: Segment, mParticle

---

## 📈 Real-Time Insights Dashboard (Coming Soon)

Preview what partners get access to:

### 🗺️ Intent Heatmaps
- Visual representation of user intent by location and time
- Category-level interest mapping
- Behavioral flow visualization

### 📍 Geo-Trending Categories
- Real-time trending topics by geographic region
- Seasonal and temporal pattern analysis
- Cross-location intent correlation

### 👥 Demographic + Behavior Segmentation
- Anonymous audience segments based on behavioral patterns
- Intent-driven cohort analysis
- Predictive modeling for future actions

### 🔌 API Access
```javascript
// Example API access to user cluster scores
const intentScore = await AnonSDK.getIntentScore('electronics');
const audienceSegment = await AnonSDK.getAudienceSegment();
```

---

## 📚 Documentation & Resources

- **[📖 Full Documentation](https://github.com/oncabteam/anon)**
- **[🛠️ API Reference](https://github.com/oncabteam/anon)**
- **[💻 Code Examples](https://github.com/oncabteam/anon)**
- **[❓ FAQ](https://github.com/oncabteam/anon)**

---

## 🤝 Partner With Us

### Ready to Get Started?

| Option | Description | Action |
|--------|-------------|--------|
| **🚀 Download SDK** | Get immediate access to our SDK | [GitHub Repository](https://github.com/oncabaret/anon-sdk) |
| **📋 Join the Beta** | Early access to new features | [Beta Waitlist](https://forms.oncabaret.com/beta) |
| **💬 Talk to Sales** | Custom enterprise solutions | [Schedule Call](https://calendly.com/oncabaret/demo) |
| **📧 Contact Us** | Questions or custom integrations | [sales-sdk+team@oncabaaret.com](mailto:sales-sdk+team@oncabaaret.com) |

### Support & Community
- **📞 Support**: [support@oncabaret.com](mailto:support@oncabaret.com)
- **💬 Community Slack**: [Join Here](https://oncabaret.slack.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/oncabaret/anon-sdk/issues)

---

## 📄 License

This project is licensed under the OnCabaret Commercial License - see the [LICENSE](LICENSE) file for details.

**⚠️ API Key Required**: This SDK requires a valid API Key from OnCabaret to function. [Get your API Key here](https://oncabaret.com/api-access).

## 🏢 About OnCabaret

OnCabaret is pioneering the future of privacy-first behavioral intelligence. Our platform powers anonymous intent understanding across mobile, web, and DOOH surfaces, enabling better user experiences while respecting privacy.

---

**Made with ❤️ by the OnCabaret Team**

*Last updated: December 2024*
