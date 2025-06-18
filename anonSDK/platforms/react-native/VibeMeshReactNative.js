/**
 * VibeMesh SDK for React Native
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import { VibeMeshCore, EVENT_TYPES } from '../../core/VibeMeshCore';

/**
 * React Native Storage Implementation
 */
class ReactNativeStorage {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Storage setItem error:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return false;
    }
  }
}

/**
 * React Native Network Implementation
 */
class ReactNativeNetwork {
  constructor() {
    this.networkListener = null;
    this.isOnline = true;
  }

  addNetworkListener(callback) {
    this.networkListener = NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      callback(this.isOnline);
    });
  }

  removeNetworkListener() {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }

  async post(url, data, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VibeMesh-RN/1.0.0',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return true;
        } else {
          console.error(`HTTP ${response.status}:`, await response.text());
          return false;
        }
      } catch (error) {
        console.error(`Network attempt ${attempt + 1} failed:`, error);
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    return false;
  }
}

/**
 * React Native Geolocation Implementation
 */
class ReactNativeGeo {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        error => reject(error),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  async watchPosition(callback) {
    return Geolocation.watchPosition(
      position => {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      error => console.error('Geolocation watch error:', error),
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
        distanceFilter: 100, // Only update when moved 100m
      }
    );
  }

  clearWatch(watchId) {
    Geolocation.clearWatch(watchId);
  }
}

/**
 * VibeMesh React Native SDK
 */
class VibeMeshReactNative extends VibeMeshCore {
  constructor() {
    super();
    this.appStateSubscription = null;
    this.currentAppState = AppState.currentState;
  }

  async init(config = {}) {
    // Set platform-specific implementations
    const reactNativeConfig = {
      ...config,
      platform: 'react-native',
      storage: new ReactNativeStorage(),
      network: new ReactNativeNetwork(),
      geoImplementation: config.geo ? new ReactNativeGeo() : null,
    };

    await super.init(reactNativeConfig);

    // Set up app state listeners for session management
    this._setupAppStateHandlers();
  }

  _setupAppStateHandlers() {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (this.currentAppState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        this.track(EVENT_TYPES.APP_OPEN, {
          previous_state: this.currentAppState,
          session_id: this.getSessionId(),
        });
        
        // Try to flush any pending events
        this.flush();
      } else if (this.currentAppState === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        this.track(EVENT_TYPES.APP_BACKGROUND, {
          next_state: nextAppState,
          session_id: this.getSessionId(),
        });
        
        // Force flush before going to background
        this.flush();
      }
      
      this.currentAppState = nextAppState;
    });
  }

  /**
   * Track venue view with React Native specific context
   */
  async trackVenueView(venue, geoContext = null) {
    return this.track(EVENT_TYPES.VIEW_VENUE, {
      entity_id: venue.id,
      venue_id: venue.id,
      venue_name: venue.name,
      category: venue.category,
      tags: venue.tags || [],
      rating: venue.rating,
      price_level: venue.price_level,
    }, geoContext);
  }

  /**
   * Track event view with React Native specific context
   */
  async trackEventView(event, geoContext = null) {
    return this.track(EVENT_TYPES.VIEW_EVENT, {
      entity_id: event.id,
      event_id: event.id,
      event_name: event.name,
      event_date: event.date,
      venue_id: event.venue_id,
      category: event.category,
      tags: event.tags || [],
      price: event.price,
    }, geoContext);
  }

  /**
   * Track search with React Native specific context
   */
  async trackSearch(query, results = [], filters = {}, geoContext = null) {
    return this.track(EVENT_TYPES.SEARCH, {
      search_query: query,
      result_count: results.length,
      filters,
      has_location_filter: !!filters.location,
      has_date_filter: !!filters.date,
      has_category_filter: !!filters.category,
    }, geoContext);
  }

  /**
   * Track map interaction with React Native specific context
   */
  async trackMapInteraction(interactionType, mapState, geoContext = null) {
    const eventType = {
      'move': EVENT_TYPES.MAP_MOVE,
      'zoom': EVENT_TYPES.MAP_ZOOM,
      'filter': EVENT_TYPES.MAP_FILTER,
      'center': EVENT_TYPES.MAP_CENTER,
    }[interactionType] || EVENT_TYPES.MAP_MOVE;

    return this.track(eventType, {
      interaction_type: interactionType,
      zoom_level: mapState.zoom,
      center_lat: mapState.center?.lat,
      center_lng: mapState.center?.lng,
      visible_bounds: mapState.bounds,
      filters_applied: mapState.filters || [],
    }, geoContext);
  }

  /**
   * Track user interaction with tags/categories
   */
  async trackTagInteraction(tag, interactionType = 'click', geoContext = null) {
    return this.track(EVENT_TYPES.TAG_INTERACTION, {
      tag_id: tag.id || tag,
      tag_name: typeof tag === 'string' ? tag : tag.name,
      tag_category: typeof tag === 'object' ? tag.category : null,
      interaction_type: interactionType,
    }, geoContext);
  }

  /**
   * Track favorites
   */
  async trackFavorite(entity, entityType = 'venue', geoContext = null) {
    return this.track(EVENT_TYPES.FAVORITE, {
      entity_id: entity.id,
      entity_type: entityType,
      entity_name: entity.name,
      tags: entity.tags || [],
    }, geoContext);
  }

  /**
   * Track sharing
   */
  async trackShare(entity, entityType, platform, geoContext = null) {
    return this.track(EVENT_TYPES.SHARE, {
      entity_id: entity.id,
      entity_type: entityType,
      entity_name: entity.name,
      share_platform: platform,
      tags: entity.tags || [],
    }, geoContext);
  }

  /**
   * Clean up React Native specific resources
   */
  cleanup() {
    super.cleanup();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Create singleton instance
const VibeMesh = new VibeMeshReactNative();

// Export both the instance and the class
export default VibeMesh;
export { VibeMeshReactNative, EVENT_TYPES };

// Legacy export for backwards compatibility
export { VibeMesh };