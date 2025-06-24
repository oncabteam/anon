/**
 * OnCabaret Anonymous Intent SDK - React Native Platform
 * Mobile-specific implementation with app lifecycle tracking
 */

import AnonSDK, { INTENT_EVENT_TYPES } from '../core/AnonSDK.js';
import { AppState, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Geolocation from '@react-native-community/geolocation';

// React Native specific event types
export const RN_EVENT_TYPES = {
  ...INTENT_EVENT_TYPES,
  MAP_MOVE: 'map_move',
  MAP_ZOOM: 'map_zoom',
  MAP_FILTER: 'map_filter',
  MAP_CENTER: 'map_center',
  VENUE_VIEW: 'venue_view',
  EVENT_VIEW: 'event_view',
  NAVIGATION: 'navigation',
  DEEP_LINK: 'deep_link',
  PUSH_NOTIFICATION: 'push_notification'
};

// AsyncStorage implementation
class RNStorage {
  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage get failed:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('AsyncStorage set failed:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('AsyncStorage remove failed:', error);
      return false;
    }
  }
}

// Network implementation using NetInfo and fetch
class RNNetwork {
  constructor() {
    this.networkListeners = [];
    this.unsubscribe = null;
    this._setupNetworkListening();
  }

  async post(url, data, headers = {}) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data)
      });

      return response.ok;
    } catch (error) {
      console.warn('Network request failed:', error);
      return false;
    }
  }

  async graphql(url, payload, headers = {}) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.warn('GraphQL request failed:', error);
      return null;
    }
  }

  addNetworkListener(callback) {
    this.networkListeners.push(callback);
  }

  removeNetworkListener() {
    this.networkListeners = [];
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  _setupNetworkListening() {
    this.unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      this.networkListeners.forEach(callback => callback(isOnline));
    });
  }
}

// Geolocation implementation
class RNGeo {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async watchPosition(callback, errorCallback) {
    return Geolocation.watchPosition(
      callback,
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
        distanceFilter: 50 // 50 meters
      }
    );
  }

  clearWatch(watchId) {
    Geolocation.clearWatch(watchId);
  }
}

/**
 * React Native Anonymous Intent SDK
 */
export class AnonRNSDK extends AnonSDK {
  constructor() {
    super();
    this.appStateSubscription = null;
    this.currentAppState = AppState.currentState;
    this.appStartTime = Date.now();
    this.backgroundTime = null;
  }

  /**
   * Initialize the React Native SDK
   * @param {Object} config - Configuration options
   */
  async init(config = {}) {
    // Set up platform-specific implementations
    const rnConfig = {
      ...config,
      platform: 'react-native',
      storage: new RNStorage(),
      network: new RNNetwork(),
      geo: new RNGeo()
    };

    await super.init(rnConfig);

    // Set up app lifecycle tracking
    this._setupAppStateTracking();

    // Track app open
    await this.trackEvent(RN_EVENT_TYPES.APP_OPEN, {
      app_version: config.appVersion || 'unknown',
      platform: Platform.OS,
      platform_version: Platform.Version
    });
  }

  /**
   * Track venue view with enhanced mobile context
   * @param {Object} venue - Venue data
   * @param {Object} geoContext - Geographic context
   * @param {Object} properties - Additional properties
   */
  async trackVenueView(venue, geoContext = null, properties = {}) {
    const venueProperties = {
      venue_id: venue.id,
      venue_name: venue.name,
      venue_category: venue.category,
      venue_tags: venue.tags || [],
      venue_location: venue.location,
      screen: 'VenueDetails',
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.VENUE_VIEW, venueProperties, null, geoContext);
  }

  /**
   * Track event view with mobile context
   * @param {Object} event - Event data
   * @param {Object} geoContext - Geographic context
   * @param {Object} properties - Additional properties
   */
  async trackEventView(event, geoContext = null, properties = {}) {
    const eventProperties = {
      event_id: event.id,
      event_name: event.name,
      event_category: event.category,
      event_date: event.date,
      event_venue_id: event.venue_id,
      event_tags: event.tags || [],
      screen: 'EventDetails',
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.EVENT_VIEW, eventProperties, null, geoContext);
  }

  /**
   * Track search with results context
   * @param {string} query - Search query
   * @param {Array} results - Search results
   * @param {Object} filters - Applied filters
   * @param {Object} properties - Additional properties
   */
  async trackSearch(query, results = [], filters = {}, properties = {}) {
    const searchProperties = {
      search_query: query,
      search_results_count: results.length,
      search_filters: filters,
      search_duration: properties.duration || null,
      screen: 'Search',
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.SEARCH, searchProperties);
  }

  /**
   * Track map interaction
   * @param {string} action - 'move', 'zoom', 'filter', 'center'
   * @param {Object} mapState - Current map state
   * @param {Object} properties - Additional properties
   */
  async trackMapInteraction(action, mapState, properties = {}) {
    const mapProperties = {
      map_action: action,
      map_zoom_level: mapState.zoom || null,
      map_center_lat: mapState.center?.lat || null,
      map_center_lng: mapState.center?.lng || null,
      map_bounds: mapState.bounds || null,
      map_filters: mapState.filters || {},
      screen: 'Map',
      ...properties
    };

    const eventType = action === 'move' ? RN_EVENT_TYPES.MAP_MOVE :
                     action === 'zoom' ? RN_EVENT_TYPES.MAP_ZOOM :
                     action === 'filter' ? RN_EVENT_TYPES.MAP_FILTER :
                     action === 'center' ? RN_EVENT_TYPES.MAP_CENTER :
                     RN_EVENT_TYPES.CUSTOM;

    return this.trackEvent(eventType, mapProperties);
  }

  /**
   * Track navigation between screens
   * @param {string} fromScreen - Previous screen
   * @param {string} toScreen - New screen
   * @param {Object} properties - Additional properties
   */
  async trackNavigation(fromScreen, toScreen, properties = {}) {
    const navigationProperties = {
      from_screen: fromScreen,
      to_screen: toScreen,
      navigation_time: Date.now(),
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.NAVIGATION, navigationProperties);
  }

  /**
   * Track deep link usage
   * @param {string} url - Deep link URL
   * @param {Object} properties - Additional properties
   */
  async trackDeepLink(url, properties = {}) {
    const deepLinkProperties = {
      deep_link_url: url,
      deep_link_source: properties.source || 'unknown',
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.DEEP_LINK, deepLinkProperties);
  }

  /**
   * Track push notification interaction
   * @param {Object} notification - Notification data
   * @param {string} action - 'received', 'opened', 'dismissed'
   * @param {Object} properties - Additional properties
   */
  async trackPushNotification(notification, action, properties = {}) {
    const notificationProperties = {
      notification_id: notification.id,
      notification_title: notification.title,
      notification_body: notification.body,
      notification_action: action,
      notification_data: notification.data || {},
      ...properties
    };

    return this.trackEvent(RN_EVENT_TYPES.PUSH_NOTIFICATION, notificationProperties);
  }

  /**
   * Get enhanced device metadata for mobile
   */
  async _getDeviceMeta() {
    const dimensions = Dimensions.get('window');
    const screenDimensions = Dimensions.get('screen');

    return {
      platform: this.config.platform,
      platform_os: Platform.OS,
      platform_version: Platform.Version,
      device_width: dimensions.width,
      device_height: dimensions.height,
      screen_width: screenDimensions.width,
      screen_height: screenDimensions.height,
      device_scale: dimensions.scale || 1,
      device_font_scale: dimensions.fontScale || 1,
      is_tablet: Platform.isPad || false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up app state change tracking
   */
  _setupAppStateTracking() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      this._handleAppStateChange(nextAppState);
    });
  }

  async _handleAppStateChange(nextAppState) {
    const previousState = this.currentAppState;
    this.currentAppState = nextAppState;

    if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background
      this.backgroundTime = Date.now();
      await this.trackEvent(RN_EVENT_TYPES.APP_BACKGROUND, {
        previous_state: previousState,
        session_duration: Date.now() - this.appStartTime
      });
    } else if (previousState.match(/inactive|background/) && nextAppState === 'active') {
      // App coming to foreground
      const backgroundDuration = this.backgroundTime ? Date.now() - this.backgroundTime : 0;
      
      await this.trackEvent(RN_EVENT_TYPES.APP_FOREGROUND, {
        previous_state: previousState,
        background_duration: backgroundDuration
      });

      // Create new session if app was backgrounded for more than 30 minutes
      if (backgroundDuration > 30 * 60 * 1000) {
        await this._startNewSession();
        await this.trackEvent(RN_EVENT_TYPES.SESSION_START, {
          session_id: this.sessionId,
          trigger: 'app_foreground_new_session'
        });
      }
    }
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

    if (this.config.network) {
      this.config.network.removeNetworkListener();
    }
  }
}

// High-level convenience functions

/**
 * Initialize the React Native SDK
 * @param {Object} config - Configuration options
 */
export async function initAnonSDK(config) {
  const sdk = new AnonRNSDK();
  await sdk.init(config);
  return sdk;
}

/**
 * Quick track event function
 * @param {string} eventName - Event name
 * @param {Object} properties - Event properties
 */
export async function trackEvent(eventName, properties = {}) {
  // This would reference a global SDK instance in a real implementation
  console.warn('trackEvent called without initialized SDK instance');
}

// Export event types for convenience
export { RN_EVENT_TYPES as EVENT_TYPES };

export default AnonRNSDK;