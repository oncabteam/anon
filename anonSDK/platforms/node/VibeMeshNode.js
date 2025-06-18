/**
 * VibeMesh SDK for Node.js
 * For Digital Billboards, DOOH systems, and server-side applications
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Import core (adjust path based on your build system)
// For CommonJS environments, you might need to transpile the core
// import { VibeMeshCore, EVENT_TYPES } from '../../core/VibeMeshCore';

// For now, we'll create a simplified version that follows the same patterns
const EVENT_TYPES = {
  // Billboard/DOOH specific
  IMPRESSION: 'impression',
  DWELL_TIME: 'dwell_time',
  CONTENT_START: 'content_start',
  CONTENT_END: 'content_end',
  INTERACTION: 'interaction',
  
  // General events
  VIEW_CONTENT: 'view_content',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  SYSTEM_EVENT: 'system_event',
  ERROR: 'error',
  
  // Custom events
  CUSTOM: 'custom'
};

/**
 * Node.js Storage Implementation using file system
 */
class NodeStorage {
  constructor(storageDir = './vibemesh_storage') {
    this.storageDir = storageDir;
    this._ensureStorageDir();
  }

  async _ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Error creating storage directory:', error);
    }
  }

  _getFilePath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `${safeKey}.json`);
  }

  async getItem(key) {
    try {
      const filePath = this._getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      return data;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Storage getItem error:', error);
      }
      return null;
    }
  }

  async setItem(key, value) {
    try {
      const filePath = this._getFilePath(key);
      await fs.writeFile(filePath, value, 'utf8');
      return true;
    } catch (error) {
      console.error('Storage setItem error:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      const filePath = this._getFilePath(key);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Storage removeItem error:', error);
      }
      return false;
    }
  }
}

/**
 * Node.js Network Implementation
 */
class NodeNetwork {
  constructor() {
    this.isOnline = true; // Assume online by default for server environments
  }

  addNetworkListener(callback) {
    // In Node.js, we can implement network monitoring
    // For now, just assume always online
    callback(this.isOnline);
  }

  removeNetworkListener() {
    // No-op for Node.js
  }

  async post(url, data, retries = 3) {
    const postData = JSON.stringify(data);
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const result = await this._makeRequest(url, postData);
        if (result.success) {
          return true;
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

  _makeRequest(url, postData) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'VibeMesh-Node/1.0.0',
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: responseData });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}

/**
 * Node.js Geolocation Implementation (static/configured)
 */
class NodeGeo {
  constructor(staticLocation = null) {
    this.staticLocation = staticLocation;
  }

  async getCurrentPosition() {
    if (!this.staticLocation) {
      throw new Error('No geolocation configured for Node.js environment');
    }
    
    return {
      lat: this.staticLocation.lat,
      lng: this.staticLocation.lng,
      accuracy: 0, // Exact for static locations
      timestamp: Date.now(),
    };
  }

  setStaticLocation(lat, lng) {
    this.staticLocation = { lat, lng };
  }
}

/**
 * VibeMesh Node.js SDK for Digital Billboards and DOOH
 */
class VibeMeshNode {
  constructor() {
    this.config = {
      endpoint: 'https://api.vibemesh.io/events',
      clientId: null,
      batchSize: 50,
      flushInterval: 30000,
      debugMode: false,
      platform: 'node',
      storage: null,
      network: null,
      geoImplementation: null,
    };
    
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = null;
    this.pendingEvents = [];
    this.flushTimer = null;
    this.optedOut = false;
    
    // Billboard-specific properties
    this.deviceId = null;
    this.locationId = null;
    this.currentContent = null;
    this.sessionStartTime = null;
  }

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

    // Set platform-specific implementations
    this.config.storage = new NodeStorage(config.storageDir);
    this.config.network = new NodeNetwork();
    this.config.geoImplementation = config.staticLocation ? 
      new NodeGeo(config.staticLocation) : null;

    try {
      // Get or create device/user ID
      this.userId = await this._getOrCreateUserId();
      this.deviceId = config.deviceId || this.userId;
      this.locationId = config.locationId || 'unknown';
      
      // Create new session
      this.sessionId = uuidv4();
      this.sessionStartTime = Date.now();
      
      // Load pending events
      await this._loadPendingEvents();
      
      // Start flush timer
      this._startFlushTimer();
      
      this.isInitialized = true;
      
      // Track session start
      await this.track(EVENT_TYPES.SESSION_START, {
        device_id: this.deviceId,
        location_id: this.locationId,
        session_id: this.sessionId,
        platform: this.config.platform,
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
   */
  async track(eventType, context = {}, geoContext = null) {
    if (!this.isInitialized || this.optedOut) {
      this._log('SDK not initialized or opted out');
      return null;
    }

    try {
      // Get geo context if available
      if (this.config.geoImplementation && !geoContext) {
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
        timestamp: new Date().toISOString(),
        uuid: this.userId,
        device_id: this.deviceId,
        location_id: this.locationId,
        session_id: this.sessionId,
        client_id: this.config.clientId,
        platform: this.config.platform,
        context,
        geo: geoContext,
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
   * Track digital billboard impression
   */
  async trackImpression(content, estimatedViewers = 1, geoContext = null) {
    return this.track(EVENT_TYPES.IMPRESSION, {
      content_id: content.id,
      content_name: content.name,
      content_type: content.type,
      content_duration: content.duration,
      estimated_viewers: estimatedViewers,
      display_time: new Date().toISOString(),
      content_tags: content.tags || [],
    }, geoContext);
  }

  /**
   * Track dwell time (how long people stay near the billboard)
   */
  async trackDwellTime(dwellTimeMs, estimatedViewers = 1, geoContext = null) {
    return this.track(EVENT_TYPES.DWELL_TIME, {
      dwell_time_ms: dwellTimeMs,
      dwell_time_seconds: Math.round(dwellTimeMs / 1000),
      estimated_viewers: estimatedViewers,
      location_id: this.locationId,
    }, geoContext);
  }

  /**
   * Track content start/end for measuring completion rates
   */
  async trackContentStart(content, geoContext = null) {
    this.currentContent = content;
    return this.track(EVENT_TYPES.CONTENT_START, {
      content_id: content.id,
      content_name: content.name,
      content_type: content.type,
      content_duration: content.duration,
      start_time: new Date().toISOString(),
    }, geoContext);
  }

  async trackContentEnd(content, actualDuration = null, geoContext = null) {
    const endEvent = await this.track(EVENT_TYPES.CONTENT_END, {
      content_id: content.id,
      content_name: content.name,
      content_type: content.type,
      planned_duration: content.duration,
      actual_duration: actualDuration,
      end_time: new Date().toISOString(),
      completion_rate: actualDuration && content.duration ? 
        Math.min(1, actualDuration / content.duration) : null,
    }, geoContext);
    
    this.currentContent = null;
    return endEvent;
  }

  /**
   * Track interactions (QR code scans, NFC taps, etc.)
   */
  async trackInteraction(interactionType, details = {}, geoContext = null) {
    return this.track(EVENT_TYPES.INTERACTION, {
      interaction_type: interactionType,
      interaction_time: new Date().toISOString(),
      location_id: this.locationId,
      content_id: this.currentContent?.id,
      ...details,
    }, geoContext);
  }

  /**
   * Track system events (errors, maintenance, etc.)
   */
  async trackSystemEvent(eventType, details = {}, geoContext = null) {
    return this.track(EVENT_TYPES.SYSTEM_EVENT, {
      system_event_type: eventType,
      device_id: this.deviceId,
      location_id: this.locationId,
      ...details,
    }, geoContext);
  }

  /**
   * Batch track multiple events
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
   * Get pending events count
   */
  getPendingEventsCount() {
    return this.pendingEvents.length;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Track session end
    if (this.isInitialized && this.sessionStartTime) {
      this.track(EVENT_TYPES.SESSION_END, {
        session_duration: Date.now() - this.sessionStartTime,
        session_id: this.sessionId,
        device_id: this.deviceId,
        location_id: this.locationId,
      });
    }
    
    // Final flush
    this._flushEvents();
    
    this._log('SDK cleaned up');
  }

  // Private methods

  async _getOrCreateUserId() {
    const key = '@VibeMesh:userId';
    let userId = await this.config.storage.getItem(key);
    
    if (!userId) {
      userId = `billboard-${uuidv4()}`;
      await this.config.storage.setItem(key, userId);
    }
    
    return userId;
  }

  async _loadPendingEvents() {
    try {
      const key = '@VibeMesh:pendingEvents';
      const eventsJson = await this.config.storage.getItem(key);
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
      const key = '@VibeMesh:pendingEvents';
      await this.config.storage.setItem(key, JSON.stringify(this.pendingEvents));
    } catch (error) {
      this._log('Error saving pending events:', error);
    }
  }

  async _flushEvents() {
    if (this.pendingEvents.length === 0 || this.optedOut) {
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
        const key = '@VibeMesh:lastSync';
        await this.config.storage.setItem(key, new Date().toISOString());
        
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
      device_id: this.deviceId,
      location_id: this.locationId,
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
      [EVENT_TYPES.IMPRESSION]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.DWELL_TIME]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.INTERACTION]: 90 * 24 * 60 * 60, // 90 days
      [EVENT_TYPES.CONTENT_START]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.CONTENT_END]: 30 * 24 * 60 * 60, // 30 days
      [EVENT_TYPES.SYSTEM_EVENT]: 30 * 24 * 60 * 60, // 30 days
    };
    
    return ttlMap[eventType] || 30 * 24 * 60 * 60; // Default 30 days
  }

  _log(...args) {
    if (this.config.debugMode) {
      console.log('[VibeMesh]', ...args);
    }
  }
}

// Export for Node.js usage
module.exports = { VibeMeshNode, EVENT_TYPES };

// Also support ES6 imports if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = VibeMeshNode;
}