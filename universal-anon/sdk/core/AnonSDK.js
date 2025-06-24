/**
 * OnCabaret Anonymous Intent Graph SDK Core
 * Privacy-first analytics platform for behavioral signals
 * @version 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';

// Default configuration
const DEFAULT_CONFIG = {
  apiKey: null,
  endpoint: 'https://api.oncabaret.com/intent/graphql',
  restEndpoint: 'https://api.oncabaret.com/intent/event',
  environment: 'production',
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  debugMode: false,
  platform: 'unknown',
  onConsent: () => true,
  storage: null, // Platform-specific storage implementation
  network: null, // Platform-specific network implementation
  geo: null,     // Platform-specific geolocation implementation
  privacy: {
    collectIP: false,
    hashIPs: true,
    anonymizeLocation: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    dataRetention: 365 * 24 * 60 * 60 // 365 days in seconds
  }
};

// Standard event types for intent tracking
export const INTENT_EVENT_TYPES = {
  // Behavioral Signals
  TAP_TO_SAVE: 'tap_to_save',
  HOVER: 'hover',
  SWIPE_LEFT: 'swipe_left',
  SWIPE_RIGHT: 'swipe_right',
  SCROLL_DEPTH: 'scroll_depth',
  ZOOM_IN: 'zoom_in',
  ZOOM_OUT: 'zoom_out',
  LONG_PRESS: 'long_press',
  
  // Navigation & Discovery
  PAGE_VIEW: 'page_view',
  SEARCH: 'search',
  FILTER_APPLY: 'filter_apply',
  CATEGORY_BROWSE: 'category_browse',
  
  // Engagement Signals
  CONTENT_VIEW: 'content_view',
  CONTENT_SHARE: 'content_share',
  CONTENT_SAVE: 'content_save',
  FORM_START: 'form_start',
  FORM_ABANDON: 'form_abandon',
  FORM_COMPLETE: 'form_complete',
  
  // Session & Lifecycle
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  SESSION_IDLE: 'session_idle',
  APP_BACKGROUND: 'app_background',
  APP_FOREGROUND: 'app_foreground',
  
  // Intent Indicators
  PURCHASE_INTENT: 'purchase_intent',
  BROWSE_INTENT: 'browse_intent',
  COMPARE_INTENT: 'compare_intent',
  EXIT_INTENT: 'exit_intent',
  
  // Custom Events
  CUSTOM: 'custom'
};

// Storage keys
const STORAGE_KEYS = {
  ANON_ID: '@AnonSDK:anonId',
  SESSION_ID: '@AnonSDK:sessionId',
  PENDING_EVENTS: '@AnonSDK:pendingEvents',
  LAST_SYNC: '@AnonSDK:lastSync',
  CONSENT_STATUS: '@AnonSDK:consentStatus',
  CONFIG: '@AnonSDK:config'
};

/**
 * Core Anonymous Intent SDK class
 */
export class AnonSDK {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.isInitialized = false;
    this.anonId = null;
    this.sessionId = null;
    this.pendingEvents = [];
    this.flushTimer = null;
    this.sessionTimer = null;
    this.isOnline = true;
    this.hasConsent = false;
    this.sessionStartTime = null;
  }

  /**
   * Initialize the Anonymous Intent SDK
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - Your OnCabaret API key
   * @param {string} config.environment - Environment ('production', 'staging', 'development')
   * @param {Function} config.onConsent - Consent callback function
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

    if (!this.config.apiKey) {
      throw new Error('AnonSDK: apiKey is required');
    }

    if (!this.config.storage) {
      throw new Error('AnonSDK: storage implementation is required');
    }

    if (!this.config.network) {
      throw new Error('AnonSDK: network implementation is required');
    }

    try {
      // Check consent status
      this.hasConsent = await this._checkConsent();
      
      if (!this.hasConsent) {
        this._log('User consent not granted, SDK will not track events');
        return;
      }

      // Get or create anonymous ID
      this.anonId = await this._getOrCreateAnonId();
      
      // Create new session
      await this._startNewSession();
      
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
      
      // Start session monitoring
      this._startSessionMonitoring();
      
      this.isInitialized = true;
      
      // Track session start
      await this.trackEvent(INTENT_EVENT_TYPES.SESSION_START, {
        session_id: this.sessionId,
        platform: this.config.platform
      });
      
      // Initial flush attempt
      this._flushEvents();
      
      this._log('Anonymous Intent SDK initialized successfully');
      
    } catch (error) {
      this._log('Error initializing SDK:', error);
      throw error;
    }
  }

  /**
   * Track an intent event
   * @param {string} eventName - Type of event (use INTENT_EVENT_TYPES constants)
   * @param {Object} properties - Event properties and context
   * @param {Object} deviceMeta - Device metadata (optional)
   * @param {Object} geo - Geographic context (optional)
   */
  async trackEvent(eventName, properties = {}, deviceMeta = null, geo = null) {
    if (!this.isInitialized || !this.hasConsent) {
      this._log('SDK not initialized or consent not granted');
      return null;
    }

    try {
      // Get device metadata if not provided
      if (!deviceMeta && this.config.platform) {
        deviceMeta = await this._getDeviceMeta();
      }

      // Get geo context if enabled and not provided
      if (this.config.geo && !geo && this.config.geo.getCurrentPosition) {
        try {
          const position = await this.config.geo.getCurrentPosition();
          geo = this._anonymizeLocation(position);
        } catch (error) {
          this._log('Failed to get location:', error);
        }
      }

      // Create standardized intent event
      const event = {
        eventId: uuidv4(),
        eventName,
        anonId: this.anonId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        properties: this._sanitizeProperties(properties),
        deviceMeta: this._sanitizeDeviceMeta(deviceMeta),
        geo: geo,
        platform: this.config.platform,
        environment: this.config.environment,
        sdkVersion: '1.0.0'
      };

      // Add to pending events
      this.pendingEvents.push(event);
      
      // Save to storage
      await this._savePendingEvents();
      
      this._log('Intent event tracked:', eventName, properties);
      
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
   * Track multiple intent events at once
   * @param {Array} events - Array of {eventName, properties, deviceMeta, geo} objects
   */
  async trackBatch(events) {
    const results = [];
    for (const event of events) {
      const result = await this.trackEvent(
        event.eventName, 
        event.properties, 
        event.deviceMeta, 
        event.geo
      );
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
   * Update consent status
   * @param {boolean} hasConsent - Whether user has granted consent
   */
  async setConsent(hasConsent) {
    this.hasConsent = hasConsent;
    await this._setStorageItem(STORAGE_KEYS.CONSENT_STATUS, hasConsent.toString());
    
    if (!hasConsent) {
      // Clear pending events and stop tracking
      this.pendingEvents = [];
      await this._setStorageItem(STORAGE_KEYS.PENDING_EVENTS, '[]');
      
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      
      this._log('Consent revoked, tracking stopped');
    } else if (this.isInitialized) {
      // Resume tracking
      this._startFlushTimer();
      this._log('Consent granted, tracking resumed');
    }
  }

  /**
   * Get current consent status
   */
  hasUserConsent() {
    return this.hasConsent;
  }

  /**
   * Get pending events count
   */
  getPendingEventsCount() {
    return this.pendingEvents.length;
  }

  /**
   * Get anonymous ID
   */
  getAnonId() {
    return this.anonId;
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
    
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    if (this.config.network && this.config.network.removeNetworkListener) {
      this.config.network.removeNetworkListener();
    }
    
    this._log('SDK cleaned up');
  }

  // Private methods

  async _checkConsent() {
    const storedConsent = await this._getStorageItem(STORAGE_KEYS.CONSENT_STATUS);
    if (storedConsent !== null) {
      return storedConsent === 'true';
    }
    
    // Check with callback if no stored consent
    if (this.config.onConsent && typeof this.config.onConsent === 'function') {
      const consent = this.config.onConsent();
      await this._setStorageItem(STORAGE_KEYS.CONSENT_STATUS, consent.toString());
      return consent;
    }
    
    return false;
  }

  async _getOrCreateAnonId() {
    let anonId = await this._getStorageItem(STORAGE_KEYS.ANON_ID);
    
    if (!anonId) {
      anonId = `anon-${uuidv4()}`;
      await this._setStorageItem(STORAGE_KEYS.ANON_ID, anonId);
    }
    
    return anonId;
  }

  async _startNewSession() {
    this.sessionId = uuidv4();
    this.sessionStartTime = Date.now();
    await this._setStorageItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
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
    if (!this.isOnline || this.pendingEvents.length === 0 || !this.hasConsent) {
      return;
    }

    const eventsToSend = this.pendingEvents.slice(0, this.config.batchSize);
    
    try {
      const success = await this._sendEventsGraphQL(eventsToSend);
      
      if (success) {
        // Remove sent events from pending list
        this.pendingEvents = this.pendingEvents.slice(eventsToSend.length);
        await this._savePendingEvents();
        
        // Update last sync time
        await this._setStorageItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
        
        this._log(`Successfully sent ${eventsToSend.length} intent events`);
        
        // If more events pending, schedule next flush
        if (this.pendingEvents.length > 0) {
          setTimeout(() => this._flushEvents(), 100);
        }
      }
    } catch (error) {
      this._log('Error flushing events:', error);
    }
  }

  async _sendEventsGraphQL(events) {
    const mutation = `
      mutation TrackIntentEvents($input: [IntentEventInput!]!) {
        trackIntentEvents(input: $input) {
          success
          eventIds
          errors
        }
      }
    `;

    const variables = {
      input: events.map(event => ({
        eventId: event.eventId,
        eventName: event.eventName,
        anonId: event.anonId,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        properties: event.properties,
        deviceMeta: event.deviceMeta,
        geo: event.geo,
        platform: event.platform,
        environment: event.environment
      }))
    };

    try {
      const result = await this.config.network.graphql(this.config.endpoint, {
        query: mutation,
        variables
      }, {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      });

      return result && result.data && result.data.trackIntentEvents && result.data.trackIntentEvents.success;
    } catch (error) {
      this._log('GraphQL error sending events:', error);
      
      // Fallback to REST API
      try {
        return await this._sendEventsREST(events);
      } catch (restError) {
        this._log('REST fallback error:', restError);
        return false;
      }
    }
  }

  async _sendEventsREST(events) {
    const payload = {
      apiKey: this.config.apiKey,
      events
    };

    try {
      return await this.config.network.post(this.config.restEndpoint, payload);
    } catch (error) {
      this._log('REST API error sending events:', error);
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

  _startSessionMonitoring() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    
    // Check for session timeout every minute
    this.sessionTimer = setInterval(() => {
      const now = Date.now();
      if (now - this.sessionStartTime > this.config.privacy.sessionTimeout) {
        this._endSession();
        this._startNewSession();
      }
    }, 60000);
  }

  async _endSession() {
    if (this.sessionId) {
      await this.trackEvent(INTENT_EVENT_TYPES.SESSION_END, {
        session_duration: Date.now() - this.sessionStartTime,
        events_tracked: this.pendingEvents.length
      });
    }
  }

  async _getDeviceMeta() {
    // Platform-specific device metadata will be implemented by platform adapters
    return {
      platform: this.config.platform,
      timestamp: new Date().toISOString()
    };
  }

  _anonymizeLocation(position) {
    if (!this.config.privacy.anonymizeLocation) {
      return position;
    }
    
    // Reduce precision to ~1km accuracy for privacy
    return {
      lat: Math.round(position.lat * 100) / 100,
      lng: Math.round(position.lng * 100) / 100
    };
  }

  _sanitizeProperties(properties) {
    // Remove any potentially sensitive data
    const sanitized = { ...properties };
    
    // Remove common PII fields
    const piiFields = ['email', 'phone', 'name', 'address', 'creditCard', 'ssn'];
    piiFields.forEach(field => delete sanitized[field]);
    
    return sanitized;
  }

  _sanitizeDeviceMeta(deviceMeta) {
    if (!deviceMeta) return null;
    
    const sanitized = { ...deviceMeta };
    
    // Hash IP if present
    if (sanitized.ip && this.config.privacy.hashIPs) {
      sanitized.ip = this._hashString(sanitized.ip);
    }
    
    return sanitized;
  }

  _hashString(str) {
    // Simple hash function for demonstration
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  async _getStorageItem(key) {
    return this.config.storage.getItem(key);
  }

  async _setStorageItem(key, value) {
    return this.config.storage.setItem(key, value);
  }

  _log(...args) {
    if (this.config.debugMode) {
      console.log('[AnonSDK]', ...args);
    }
  }
}

export default AnonSDK;