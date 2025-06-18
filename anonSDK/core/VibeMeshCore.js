/**
 * VibeMesh Universal SDK Core
 * Platform-agnostic analytics and intent tracking via anonymized intent graph
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

// Default configuration
const DEFAULT_CONFIG = {
  endpoint: 'https://api.vibemesh.io/events',
  clientId: null,
  geo: false,
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  debugMode: false,
  platform: 'unknown',
  storage: null, // Platform-specific storage implementation
  network: null, // Platform-specific network implementation
  geo: null,     // Platform-specific geolocation implementation
};

// Standard event types
export const EVENT_TYPES = {
  // Content interactions
  VIEW_VENUE: 'view_venue',
  VIEW_EVENT: 'view_event',
  VIEW_CONTENT: 'view_content',
  
  // User actions
  SEARCH: 'search',
  SEARCH_RESULT_CLICK: 'search_result_click',
  TAG_INTERACTION: 'tag_interaction',
  FAVORITE: 'favorite',
  UNFAVORITE: 'unfavorite',
  SHARE: 'share',
  BOOKING: 'booking',
  
  // Navigation
  MAP_MOVE: 'map_move',
  MAP_ZOOM: 'map_zoom',
  MAP_FILTER: 'map_filter',
  MAP_CENTER: 'map_center',
  
  // App lifecycle
  APP_OPEN: 'app_open',
  APP_BACKGROUND: 'app_background',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Billboard/DOOH specific
  IMPRESSION: 'impression',
  DWELL_TIME: 'dwell_time',
  
  // Custom events
  CUSTOM: 'custom'
};

// Storage keys
const STORAGE_KEYS = {
  USER_ID: '@VibeMesh:userId',
  PENDING_EVENTS: '@VibeMesh:pendingEvents',
  LAST_SYNC: '@VibeMesh:lastSync',
  SESSION_ID: '@VibeMesh:sessionId',
  CONFIG: '@VibeMesh:config',
  OPT_OUT: '@VibeMesh:optOut'
};

/**
 * Core VibeMesh SDK class
 */
export class VibeMeshCore {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = null;
    this.pendingEvents = [];
    this.flushTimer = null;
    this.isOnline = true;
    this.optedOut = false;
  }

  /**
   * Initialize the SDK
   * @param {Object} config - Configuration options
   * @param {string} config.clientId - Your VibeMesh client ID
   * @param {string} config.endpoint - API endpoint URL
   * @param {boolean} config.geo - Enable geolocation tracking
   * @param {string} config.platform - Platform identifier
   * @param {Object} config.storage - Platform-specific storage implementation
   * @param {Object} config.network - Platform-specific network implementation
   * @param {Object} config.geo - Platform-specific geolocation implementation
   */
  async init(config = {}) {
    if (this.isInitialized) {
      this._log('SDK already initialized');
      return;
    }

    // Merge configuration
    this.config = { ...this.config, ...config };

    if (!this.config.clientId) {
      throw new Error('VibeMesh: clientId is required');
    }

    if (!this.config.storage) {
      throw new Error('VibeMesh: storage implementation is required');
    }

    if (!this.config.network) {
      throw new Error('VibeMesh: network implementation is required');
    }

    try {
      // Check opt-out status
      this.optedOut = await this._getStorageItem(STORAGE_KEYS.OPT_OUT) === 'true';
      
      if (this.optedOut) {
        this._log('User has opted out, SDK will not track events');
        return;
      }

      // Get or create user ID
      this.userId = await this._getOrCreateUserId();
      
      // Create new session
      this.sessionId = uuidv4();
      await this._setStorageItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
      
      // Load pending events
      await this._loadPendingEvents();
      
      // Set up network listener if available
      if (this.config.network.addNetworkListener) {
        this.config.network.addNetworkListener((isOnline) => {
          this.isOnline = isOnline;
          if (isOnline && this.pendingEvents.length > 0) {
            this._flushEvents();
          }
        });
      }

      // Start flush timer
      this._startFlushTimer();
      
      this.isInitialized = true;
      
      // Track session start
      await this.track(EVENT_TYPES.SESSION_START, {
        session_id: this.sessionId,
        platform: this.config.platform
      });
      
      // Initial flush attempt
      this._flushEvents();
      
      this._log('SDK initialized successfully');
      
    } catch (error) {
      this._log('Error initializing SDK:', error);
      throw error;
    }
  }

  /**
   * Track an event
   * @param {string} eventType - Type of event (use EVENT_TYPES constants)
   * @param {Object} context - Event context data
   * @param {Object} geoContext - Geographic context (optional)
   */
  async track(eventType, context = {}, geoContext = null) {
    if (!this.isInitialized || this.optedOut) {
      this._log('SDK not initialized or user opted out');
      return null;
    }

    try {
      // Get geo context if enabled and not provided
      if (this.config.geo && !geoContext && this.config.geoImplementation) {
        try {
          geoContext = await this.config.geoImplementation.getCurrentPosition();
        } catch (error) {
          this._log('Failed to get location:', error);
        }
      }

      // Create standardized event
      const event = {
        event_id: uuidv4(),
        event_type: eventType,
        entity_id: context.entity_id || context.venue_id || context.event_id || null,
        timestamp: new Date().toISOString(),
        uuid: this.userId,
        session_id: this.sessionId,
        client_id: this.config.clientId,
        platform: this.config.platform,
        context,
        geo: geoContext,
        tags: context.tags || [],
        ttl: this._getTTLForEventType(eventType)
      };

      // Add to pending events
      this.pendingEvents.push(event);
      
      // Save to storage
      await this._savePendingEvents();
      
      this._log('Event tracked:', eventType, context);
      
      // Trigger immediate flush if batch size reached
      if (this.pendingEvents.length >= this.config.batchSize) {
        this._flushEvents();
      }
      
      return event;
      
    } catch (error) {
      this._log('Error tracking event:', error);
      return null;
    }
  }

  /**
   * Track multiple events at once
   * @param {Array} events - Array of {eventType, context, geoContext} objects
   */
  async trackBatch(events) {
    const results = [];
    for (const event of events) {
      const result = await this.track(event.eventType, event.context, event.geoContext);
      results.push(result);
    }
    return results;
  }

  /**
   * Force flush pending events
   */
  async flush() {
    return this._flushEvents();
  }

  /**
   * Opt user out of tracking
   */
  async optOut() {
    this.optedOut = true;
    await this._setStorageItem(STORAGE_KEYS.OPT_OUT, 'true');
    
    // Clear pending events
    this.pendingEvents = [];
    await this._setStorageItem(STORAGE_KEYS.PENDING_EVENTS, '[]');
    
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    this._log('User opted out of tracking');
  }

  /**
   * Opt user back into tracking
   */
  async optIn() {
    this.optedOut = false;
    await this._setStorageItem(STORAGE_KEYS.OPT_OUT, 'false');
    
    if (this.isInitialized) {
      this._startFlushTimer();
    }
    
    this._log('User opted back into tracking');
  }

  /**
   * Get current opt-out status
   */
  isOptedOut() {
    return this.optedOut;
  }

  /**
   * Get pending events count
   */
  getPendingEventsCount() {
    return this.pendingEvents.length;
  }

  /**
   * Get user ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Get session ID
   */
  getSessionId() {
    return this.sessionId;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.config.network && this.config.network.removeNetworkListener) {
      this.config.network.removeNetworkListener();
    }
    
    this._log('SDK cleaned up');
  }

  // Private methods

  async _getOrCreateUserId() {
    let userId = await this._getStorageItem(STORAGE_KEYS.USER_ID);
    
    if (!userId) {
      userId = `anon-${uuidv4()}`;
      await this._setStorageItem(STORAGE_KEYS.USER_ID, userId);
    }
    
    return userId;
  }

  async _loadPendingEvents() {
    try {
      const eventsJson = await this._getStorageItem(STORAGE_KEYS.PENDING_EVENTS);
      if (eventsJson) {
        this.pendingEvents = JSON.parse(eventsJson);
      }
    } catch (error) {
      this._log('Error loading pending events:', error);
      this.pendingEvents = [];
    }
  }

  async _savePendingEvents() {
    try {
      await this._setStorageItem(STORAGE_KEYS.PENDING_EVENTS, JSON.stringify(this.pendingEvents));
    } catch (error) {
      this._log('Error saving pending events:', error);
    }
  }

  async _flushEvents() {
    if (!this.isOnline || this.pendingEvents.length === 0 || this.optedOut) {
      return;
    }

    const eventsToSend = this.pendingEvents.slice(0, this.config.batchSize);
    
    try {
      const success = await this._sendEvents(eventsToSend);
      
      if (success) {
        // Remove sent events from pending list
        this.pendingEvents = this.pendingEvents.slice(eventsToSend.length);
        await this._savePendingEvents();
        
        // Update last sync time
        await this._setStorageItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        
        this._log(`Successfully sent ${eventsToSend.length} events`);
        
        // If more events pending, schedule next flush
        if (this.pendingEvents.length > 0) {
          setTimeout(() => this._flushEvents(), 100);
        }
      }
    } catch (error) {
      this._log('Error flushing events:', error);
    }
  }

  async _sendEvents(events) {
    const payload = {
      client_id: this.config.clientId,
      events
    };

    try {
      return await this.config.network.post(this.config.endpoint, payload);
    } catch (error) {
      this._log('Network error sending events:', error);
      return false;
    }
  }

  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this._flushEvents();
    }, this.config.flushInterval);
  }

  _getTTLForEventType(eventType) {
    const ttlMap = {
      [EVENT_TYPES.VIEW_VENUE]: 180 * 24 * 60 * 60, // 180 days
      [EVENT_TYPES.VIEW_EVENT]: 180 * 24 * 60 * 60, // 180 days
      [EVENT_TYPES.FAVORITE]: 365 * 24 * 60 * 60, // 365 days
      [EVENT_TYPES.SEARCH]: 90 * 24 * 60 * 60, // 90 days
      [EVENT_TYPES.MAP_MOVE]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.MAP_ZOOM]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.IMPRESSION]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.SESSION_START]: 30 * 24 * 60 * 60, // 30 days
    };
    
    return ttlMap[eventType] || 90 * 24 * 60 * 60; // Default 90 days
  }

  async _getStorageItem(key) {
    return this.config.storage.getItem(key);
  }

  async _setStorageItem(key, value) {
    return this.config.storage.setItem(key, value);
  }

  _log(...args) {
    if (this.config.debugMode) {
      console.log('[VibeMesh]', ...args);
    }
  }
}

export default VibeMeshCore;