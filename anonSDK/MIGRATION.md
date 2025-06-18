# Migration Guide: OnCabaret VibeMesh → Universal SDK

This guide helps you migrate from the OnCabaret-specific VibeMesh integration to the new Universal SDK.

## 🔄 Overview

The Universal SDK provides the same functionality as the OnCabaret integration but with:
- **Cleaner API**: Simplified, consistent interface across platforms
- **Better Performance**: Optimized batching and storage
- **Platform Agnostic**: Same API works everywhere
- **Enhanced Privacy**: Built-in opt-out and consent management
- **Future-Proof**: Support for new platforms and features

## 📋 Migration Checklist

- [ ] Install new Universal SDK
- [ ] Update initialization code
- [ ] Replace tracking calls
- [ ] Update configuration
- [ ] Test offline/online behavior
- [ ] Verify data migration (if needed)

## 🚀 Step-by-Step Migration

### 1. Installation

#### Before (OnCabaret Integration)
```javascript
// Using local files
import VibeMeshService from './VibeMeshService';
```

#### After (Universal SDK)
```bash
npm install @vibemesh/react-native
```

```javascript
import VibeMesh from '@vibemesh/react-native';
```

### 2. Initialization

#### Before
```javascript
import { OnCabaretVibeMeshService } from './OnCabaretVibeMeshIntegration';

// Initialize with hardcoded config
await OnCabaretVibeMeshService.initialize();
```

#### After
```javascript
import VibeMesh from '@vibemesh/react-native';

await VibeMesh.init({
  clientId: 'your-client-id',
  endpoint: 'https://api.vibemesh.io/events',
  geo: true,
  debugMode: __DEV__,
});
```

### 3. Event Tracking

#### Before
```javascript
// Venue view
await VibeMeshService.trackEvent('view_venue', {
  venue_id: venue.id,
  venue_name: venue.name,
  tags: venue.tags
}, geoContext);

// Search
await VibeMeshService.trackEvent('search', {
  search_query: query,
  result_count: results.length
}, geoContext);

// Tag interaction
await VibeMeshService.trackEvent('tag_interaction', {
  tag_id: tag.id,
  tag_name: tag.name,
  interaction_type: 'click'
}, geoContext);
```

#### After
```javascript
// Venue view - higher level API
await VibeMesh.trackVenueView({
  id: venue.id,
  name: venue.name,
  tags: venue.tags
}, geoContext);

// Search - improved API
await VibeMesh.trackSearch(query, results, filters, geoContext);

// Tag interaction - cleaner API
await VibeMesh.trackTagInteraction(tag, 'click', geoContext);

// Or use generic track method
await VibeMesh.track('view_venue', context, geoContext);
```

### 4. Configuration Updates

#### Before (OnCabaretVibeMeshIntegration.js)
```javascript
// Configuration was hardcoded in the file
const API_ENDPOINT = 'https://j5gmogjvr4.execute-api.us-east-1.amazonaws.com/dev/events';

Auth.configure({
  userPoolId: 'us-east-1_ciVMaEA14',
  userPoolWebClientId: '38uq7mcrdad7ghb672k7a46ccg',
  region: 'us-east-1',
});
```

#### After
```javascript
// Configuration passed to init
await VibeMesh.init({
  clientId: 'your-client-id',
  endpoint: 'https://api.vibemesh.io/events',
  geo: true,
  batchSize: 50,
  flushInterval: 30000,
  debugMode: __DEV__,
});

// Auth handled separately if needed
```

### 5. Storage Key Updates

The Universal SDK uses different storage keys. If you need to migrate existing data:

#### Before (OnCabaret Keys)
```javascript
const ONCABARET_STORAGE_KEYS = {
  SAVED_EVENTS: '@oncabaret:saved_events',
  USER_PREFERENCES: '@oncabaret:user_preferences',
  // ...
};

const VIBEMESH_STORAGE_KEYS = {
  ANON_USER_ID: '@VibeMesh:anonUserId',
  PENDING_EVENTS: '@VibeMesh:pendingEvents',
  // ...
};
```

#### After (Universal SDK Keys)
```javascript
// Keys are internal to the SDK, but if you need to migrate:
const UNIVERSAL_SDK_KEYS = {
  USER_ID: '@VibeMesh:userId',
  PENDING_EVENTS: '@VibeMesh:pendingEvents',
  LAST_SYNC: '@VibeMesh:lastSync',
  SESSION_ID: '@VibeMesh:sessionId',
  OPT_OUT: '@VibeMesh:optOut'
};
```

## 🔄 API Mapping

### Event Tracking Methods

| OnCabaret Method | Universal SDK Method | Notes |
|------------------|----------------------|-------|
| `trackEvent('view_venue', ...)` | `trackVenueView(venue, geo)` | Higher-level API |
| `trackEvent('view_event', ...)` | `trackEventView(event, geo)` | Higher-level API |
| `trackEvent('search', ...)` | `trackSearch(query, results, filters, geo)` | Improved parameters |
| `trackEvent('tag_interaction', ...)` | `trackTagInteraction(tag, type, geo)` | Cleaner API |
| `trackEvent('favorite', ...)` | `trackFavorite(entity, type, geo)` | Better typing |
| `trackEvent('MAP_MOVE', ...)` | `trackMapInteraction('move', state, geo)` | Consistent naming |
| `syncEvents()` | `flush()` | Shorter name |

### Utility Methods

| OnCabaret Method | Universal SDK Method | Notes |
|------------------|----------------------|-------|
| `_getAnonUserId()` | `getUserId()` | Public method |
| `getLastSyncTime()` | `getLastSyncTime()` | Same |
| `cleanup()` | `cleanup()` | Same |
| N/A | `getSessionId()` | New feature |
| N/A | `getPendingEventsCount()` | New feature |
| N/A | `isOptedOut()` | New feature |
| N/A | `optOut()` | New feature |
| N/A | `optIn()` | New feature |

## 📊 Data Migration Script

If you need to migrate existing OnCabaret data to the Universal SDK:

```javascript
// migration-script.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import VibeMesh from '@vibemesh/react-native';

async function migrateOnCabaretData() {
  try {
    // Initialize Universal SDK first
    await VibeMesh.init({
      clientId: 'your-client-id',
      endpoint: 'https://api.vibemesh.io/events',
    });

    // Migrate user ID if needed
    const oldUserId = await AsyncStorage.getItem('@VibeMesh:anonUserId');
    if (oldUserId) {
      console.log('Found existing user ID:', oldUserId);
      // The new SDK will create a new one, but you can track the migration
      await VibeMesh.track('user_migration', {
        old_user_id: oldUserId,
        migration_date: new Date().toISOString(),
      });
    }

    // Migrate saved events (favorites)
    const savedEventsJson = await AsyncStorage.getItem('@oncabaret:saved_events');
    if (savedEventsJson) {
      const savedEvents = JSON.parse(savedEventsJson);
      for (const event of savedEvents) {
        await VibeMesh.trackFavorite({
          id: event.id,
          name: event.name,
        }, 'event');
      }
      console.log(`Migrated ${savedEvents.length} saved events`);
    }

    // Migrate user preferences
    const userPrefsJson = await AsyncStorage.getItem('@oncabaret:user_preferences');
    if (userPrefsJson) {
      const userPrefs = JSON.parse(userPrefsJson);
      
      if (userPrefs.preferredTags) {
        for (const tag of userPrefs.preferredTags) {
          await VibeMesh.track('tag_preference', {
            tag_id: typeof tag === 'string' ? tag : tag.id,
            tag_name: typeof tag === 'string' ? tag : tag.name,
            source: 'migration',
          });
        }
      }
      
      await VibeMesh.track('user_preferences_migrated', {
        preferences: userPrefs,
        migration_date: new Date().toISOString(),
      });
      
      console.log('Migrated user preferences');
    }

    // Clean up old keys (optional)
    await AsyncStorage.multiRemove([
      '@oncabaret:saved_events',
      '@oncabaret:user_preferences',
      '@VibeMesh:anonUserId', // Old format
      '@VibeMesh:pendingEvents', // Old format
    ]);

    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration once on app startup
export default migrateOnCabaretData;
```

## 🧪 Testing Migration

### 1. Test Initialization
```javascript
describe('VibeMesh Migration', () => {
  it('should initialize successfully', async () => {
    await VibeMesh.init({
      clientId: 'test-client-id',
      endpoint: 'https://api.vibemesh.io/events',
    });
    
    expect(VibeMesh.isInitialized).toBe(true);
    expect(VibeMesh.getUserId()).toBeTruthy();
  });
});
```

### 2. Test Event Tracking
```javascript
it('should track venue views', async () => {
  const venue = {
    id: 'venue_123',
    name: 'Test Venue',
    tags: ['music', 'jazz'],
  };

  const event = await VibeMesh.trackVenueView(venue);
  
  expect(event).toBeTruthy();
  expect(event.event_type).toBe('view_venue');
  expect(event.context.venue_id).toBe('venue_123');
});
```

### 3. Test Offline Behavior
```javascript
it('should handle offline events', async () => {
  // Simulate offline
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
  
  await VibeMesh.trackVenueView({ id: 'venue_456', name: 'Offline Venue' });
  
  expect(VibeMesh.getPendingEventsCount()).toBeGreaterThan(0);
});
```

## ⚠️ Breaking Changes

### 1. Initialization
- Must call `init()` with configuration instead of hardcoded values
- Async initialization required

### 2. Event Structure
- `anon_user_id` → `uuid` (field name change)
- `event_id` remains the same
- Added `session_id` to all events
- Added `client_id` to all events

### 3. Storage Keys
- All storage keys changed to be more consistent
- Old data will not be automatically migrated

### 4. Authentication
- Cognito authentication is optional
- SDK works anonymously by default
- If you need auth, handle it separately

## 🎯 Best Practices

### 1. Gradual Migration
```javascript
// Phase 1: Initialize both systems
await OldVibeMeshService.initialize();
await VibeMesh.init(config);

// Phase 2: Track to both (for testing)
await OldVibeMeshService.trackEvent(type, context, geo);
await VibeMesh.track(type, context, geo);

// Phase 3: Remove old system
```

### 2. Feature Flags
```javascript
const useUniversalSDK = FeatureFlags.isEnabled('universal_sdk');

if (useUniversalSDK) {
  await VibeMesh.trackVenueView(venue);
} else {
  await OldVibeMeshService.trackEvent('view_venue', context, geo);
}
```

### 3. Error Handling
```javascript
try {
  await VibeMesh.trackVenueView(venue);
} catch (error) {
  console.error('VibeMesh tracking failed:', error);
  // Fallback or retry logic
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Events not syncing**
   ```javascript
   // Check network connectivity
   console.log('Pending events:', VibeMesh.getPendingEventsCount());
   
   // Force flush
   await VibeMesh.flush();
   ```

2. **Missing user ID**
   ```javascript
   // Wait for initialization
   if (!VibeMesh.isInitialized) {
     await new Promise(resolve => setTimeout(resolve, 1000));
   }
   ```

3. **Storage errors**
   ```javascript
   // Clear storage if corrupted
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```

### Debug Mode
```javascript
await VibeMesh.init({
  clientId: 'your-client-id',
  debugMode: true, // Enable detailed logging
});
```

## 📞 Support

If you encounter issues during migration:

1. Check the [Universal SDK Documentation](./README.md)
2. Review the [examples](./examples/)
3. Open an issue on GitHub
4. Contact the VibeMesh team

---

Happy migrating! 🚀