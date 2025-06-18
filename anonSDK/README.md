# VibeMesh Universal SDK

A lightweight, platform-agnostic analytics and intent tracking SDK for the VibeMesh ecosystem. Build anonymous intent graphs across React Native, Web, Node.js, and digital billboard platforms.

## 🚀 Features

- **Universal Compatibility**: Works across React Native, Web browsers, Node.js, and DOOH systems
- **Anonymous by Design**: Privacy-first with anonymous UUIDs only
- **Offline-First**: Automatic offline storage and sync when online
- **Lightweight**: ~2-3KB gzipped for web platforms
- **Geo-Aware**: Optional location context with minimal permissions
- **Event Batching**: Efficient network usage with configurable batch sizes
- **Auto-Tracking**: Web SDK includes automatic page view, click, and scroll tracking
- **Consent Management**: Built-in opt-out/opt-in functionality

## 📦 Installation

### React Native

```bash
npm install @vibemesh/react-native
# Required peer dependencies
npm install @react-native-async-storage/async-storage @react-native-community/netinfo uuid
# Optional: for location tracking
npm install @react-native-community/geolocation
```

### Web

#### Via CDN
```html
<script src="https://cdn.vibemesh.io/sdk.min.js"></script>
<script>
  window.vibemesh.init({ clientId: 'YOUR_CLIENT_ID' });
</script>
```

#### Via NPM
```bash
npm install @vibemesh/web
```

### Node.js (Digital Billboards/DOOH)

```bash
npm install @vibemesh/node
```

## 🔧 Quick Start

### React Native

```javascript
import VibeMesh from '@vibemesh/react-native';

// Initialize in your App component
await VibeMesh.init({
  clientId: 'your-client-id',
  endpoint: 'https://api.vibemesh.io/events',
  geo: true, // Enable location tracking
});

// Track events
await VibeMesh.trackVenueView({
  id: 'venue_123',
  name: 'Blue Note Jazz Club',
  tags: ['jazz', 'live_music'],
});
```

### Web

```javascript
import VibeMesh from '@vibemesh/web';

// Initialize
await VibeMesh.init({
  clientId: 'your-client-id',
  endpoint: 'https://api.vibemesh.io/events',
});

// Enable automatic tracking
VibeMesh.enableAutoTracking({
  clicks: true,
  scrollDepth: true,
  pageViews: true,
});

// Track custom events
await VibeMesh.track('view_venue', {
  venue_id: 'venue_123',
  venue_name: 'Blue Note',
});
```

### Node.js (Digital Billboards)

```javascript
const { VibeMeshNode } = require('@vibemesh/node');

const vibeMesh = new VibeMeshNode();

await vibeMesh.init({
  clientId: 'billboard-client-id',
  deviceId: 'billboard-001',
  locationId: 'times-square-north',
  staticLocation: { lat: 40.7580, lng: -73.9855 },
});

// Track billboard impressions
await vibeMesh.trackImpression({
  id: 'ad_001',
  name: 'Jazz Festival Promo',
  duration: 30000,
}, 15); // 15 estimated viewers
```

## 📊 Event Types

### Core Events
- `view_venue` - User viewed a venue
- `view_event` - User viewed an event  
- `search` - User performed a search
- `tag_interaction` - User interacted with tags
- `favorite` - User favorited content
- `map_move` - Map interaction events

### Web-Specific Events
- `page_view` - Page view tracking
- `click` - Element click tracking
- `scroll_depth` - Scroll depth milestones
- `form_submit` - Form submission tracking

### Billboard/DOOH Events
- `impression` - Content impression
- `dwell_time` - Viewer dwell time
- `content_start` - Content playback start
- `content_end` - Content playback end
- `interaction` - QR/NFC interactions

## 🔧 Platform-Specific APIs

### React Native

```javascript
// High-level tracking methods
await VibeMesh.trackVenueView(venue, geoContext);
await VibeMesh.trackEventView(event, geoContext);
await VibeMesh.trackSearch(query, results, filters);
await VibeMesh.trackMapInteraction('zoom', mapState);
await VibeMesh.trackTagInteraction(tag, 'click');
await VibeMesh.trackFavorite(venue, 'venue');
await VibeMesh.trackShare(event, 'event', 'twitter');
```

### Web

```javascript
// Auto-tracking
VibeMesh.enableAutoTracking({
  clicks: true,
  scrollDepth: true,
  formSubmits: true,
  pageViews: true,
});

// Manual tracking
await VibeMesh.trackPageView();
await VibeMesh.trackClick(element, context);
await VibeMesh.trackFormSubmit(form);
await VibeMesh.trackScrollDepth(75);
await VibeMesh.trackMediaInteraction(video, 'play');
```

### Node.js/DOOH

```javascript
// Billboard-specific tracking
await vibeMesh.trackImpression(content, viewerCount);
await vibeMesh.trackDwellTime(timeMs, viewerCount);
await vibeMesh.trackContentStart(content);
await vibeMesh.trackContentEnd(content, actualDuration);
await vibeMesh.trackInteraction('qr_scan', details);
await vibeMesh.trackSystemEvent('error', errorDetails);
```

## 🌍 Geographic Context

All platforms support optional geographic context:

```javascript
const geoContext = {
  lat: 40.7128,
  lng: -74.0060,
  city: 'New York',
  neighborhood: 'SoHo'
};

await VibeMesh.track('view_venue', context, geoContext);
```

### React Native Geolocation

```javascript
// Enable in init
await VibeMesh.init({
  clientId: 'your-client-id',
  geo: true, // Automatically get location for events
});
```

### Web Geolocation

```javascript
// Browser will prompt for permission
await VibeMesh.init({
  clientId: 'your-client-id',
  geo: true,
});
```

### Static Location (Node.js)

```javascript
await vibeMesh.init({
  clientId: 'billboard-client-id',
  staticLocation: { lat: 40.7580, lng: -73.9855 },
});
```

## 🔒 Privacy & Consent

### Opt-Out/Opt-In

```javascript
// Check status
if (VibeMesh.isOptedOut()) {
  // User has opted out
}

// Opt out
await VibeMesh.optOut();

// Opt back in
await VibeMesh.optIn();
```

### Anonymous by Design

- All user identification uses anonymous UUIDs
- No PII is ever collected
- Geographic data is optional and requires explicit permission
- Events auto-expire based on TTL (30-365 days)

## 🔄 Offline Support

The SDK automatically handles offline scenarios:

```javascript
// Events are stored locally when offline
await VibeMesh.track('view_venue', context); // Stored locally

// Automatically synced when back online
// Network state changes trigger sync attempts

// Manual flush
await VibeMesh.flush();

// Check pending events
const pendingCount = VibeMesh.getPendingEventsCount();
```

## ⚙️ Configuration

### Full Configuration Options

```javascript
await VibeMesh.init({
  clientId: 'your-client-id',           // Required
  endpoint: 'https://api.vibemesh.io/events', // API endpoint
  geo: false,                           // Enable geolocation
  batchSize: 50,                        // Events per batch
  flushInterval: 30000,                 // Auto-flush interval (ms)
  debugMode: false,                     // Enable debug logging
  
  // Platform-specific options
  storageDir: './data',                 // Node.js storage directory
  deviceId: 'device-001',               // Node.js device identifier
  locationId: 'location-001',           // Node.js location identifier
  staticLocation: { lat: 0, lng: 0 },   // Node.js static location
});
```

## 📈 Anonymous Intent Graph

VibeMesh builds an anonymous intent graph to understand user behavior while maintaining privacy:

### Node Structure

```
User Node (anon-uuid-123)
├── viewed:venue:venue_456 (weight: 1, ttl: 180d)
├── searched:"jazz clubs" (weight: 1, ttl: 90d)
├── favorited:event:event_789 (weight: 5, ttl: 365d)
└── interacted:tag:music:jazz (weight: 1, ttl: 180d)
```

### Event Weights & TTL

- **Views**: Weight 1, TTL 180 days
- **Favorites**: Weight 5, TTL 365 days  
- **Searches**: Weight 1, TTL 90 days
- **Map Interactions**: Weight 1, TTL 30 days
- **Impressions**: Weight 1, TTL 30 days

## 🔧 Advanced Usage

### Batch Tracking

```javascript
const events = [
  { eventType: 'view_venue', context: { venue_id: '1' } },
  { eventType: 'view_venue', context: { venue_id: '2' } },
  { eventType: 'search', context: { query: 'jazz' } },
];

await VibeMesh.trackBatch(events);
```

### Custom Events

```javascript
await VibeMesh.track('custom_event', {
  custom_field: 'value',
  category: 'user_action',
  metadata: { source: 'feature_flag' },
});
```

### Session Management

```javascript
// Get current session info
const sessionId = VibeMesh.getSessionId();
const userId = VibeMesh.getUserId();

// Sessions automatically created on init
// Session end tracked on app backgrounding
```

## 🔍 Debugging

### Enable Debug Mode

```javascript
await VibeMesh.init({
  clientId: 'your-client-id',
  debugMode: true, // Enables console logging
});
```

### Check SDK Status

```javascript
console.log('Initialized:', VibeMesh.isInitialized);
console.log('User ID:', VibeMesh.getUserId());
console.log('Session ID:', VibeMesh.getSessionId());
console.log('Pending Events:', VibeMesh.getPendingEventsCount());
console.log('Opted Out:', VibeMesh.isOptedOut());
```

## 📚 Examples

- [React Native Example App](./examples/react-native/)
- [Web Demo Page](./examples/web/)
- [Digital Billboard Simulation](./examples/node-billboard/)

## 🔗 Related Projects

- [VibeMesh OnCabaret Integration](../vibemesh_examples/)
- [VibeMesh Analytics Pipeline](../analytics/)

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🆘 Support

- [Documentation](https://docs.vibemesh.io)
- [API Reference](https://api.vibemesh.io/docs)
- [Community Forum](https://community.vibemesh.io)
- [GitHub Issues](https://github.com/vibemesh/sdk/issues)

---

Built with ❤️ by the VibeMesh team