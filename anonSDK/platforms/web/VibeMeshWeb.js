/**
 * VibeMesh SDK for Web
 * Lightweight JavaScript library for web analytics and intent tracking
 * @version 1.0.0
 */

import { VibeMeshCore, EVENT_TYPES } from '../../core/VibeMeshCore';

/**
 * Web Storage Implementation using localStorage
 */
class WebStorage {
  async getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Storage setItem error:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return false;
    }
  }
}

/**
 * Web Network Implementation
 */
class WebNetwork {
  constructor() {
    this.isOnline = navigator.onLine;
    this.networkListener = null;
  }

  addNetworkListener(callback) {
    this.networkListener = callback;
    
    const onOnline = () => {
      this.isOnline = true;
      callback(true);
    };
    
    const onOffline = () => {
      this.isOnline = false;
      callback(false);
    };
    
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    
    // Store listeners for cleanup
    this._onlineListener = onOnline;
    this._offlineListener = onOffline;
  }

  removeNetworkListener() {
    if (this._onlineListener) {
      window.removeEventListener('online', this._onlineListener);
      window.removeEventListener('offline', this._offlineListener);
      this._onlineListener = null;
      this._offlineListener = null;
    }
  }

  async post(url, data, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VibeMesh-Web/1.0.0',
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
 * Web Geolocation Implementation
 */
class WebGeo {
  async getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
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
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return navigator.geolocation.watchPosition(
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
      }
    );
  }

  clearWatch(watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * VibeMesh Web SDK
 */
class VibeMeshWeb extends VibeMeshCore {
  constructor() {
    super();
    this.pageLoadTime = Date.now();
    this.visibilityChangeListener = null;
    this.beforeUnloadListener = null;
  }

  async init(config = {}) {
    // Set platform-specific implementations
    const webConfig = {
      ...config,
      platform: 'web',
      storage: new WebStorage(),
      network: new WebNetwork(),
      geoImplementation: config.geo ? new WebGeo() : null,
    };

    await super.init(webConfig);

    // Set up web-specific event listeners
    this._setupWebHandlers();
    
    // Track initial page load
    this._trackPageLoad();
  }

  _setupWebHandlers() {
    // Page visibility change handler
    this.visibilityChangeListener = () => {
      if (document.hidden) {
        this.track(EVENT_TYPES.APP_BACKGROUND, {
          visibility_state: document.visibilityState,
          session_id: this.getSessionId(),
        });
        // Force flush before page becomes hidden
        this.flush();
      } else {
        this.track(EVENT_TYPES.APP_OPEN, {
          visibility_state: document.visibilityState,
          session_id: this.getSessionId(),
        });
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeListener);

    // Before unload handler for session end
    this.beforeUnloadListener = () => {
      this.track(EVENT_TYPES.SESSION_END, {
        session_duration: Date.now() - this.pageLoadTime,
        session_id: this.getSessionId(),
      });
      // Send with sendBeacon if available for reliability
      this._sendBeacon();
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  _trackPageLoad() {
    // Get page info
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: screen.width,
      screen_height: screen.height,
      color_depth: screen.colorDepth,
      pixel_ratio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };

    this.track(EVENT_TYPES.APP_OPEN, pageInfo);
  }

  /**
   * Track page view
   */
  async trackPageView(page = {}, geoContext = null) {
    const pageData = {
      url: page.url || window.location.href,
      title: page.title || document.title,
      path: page.path || window.location.pathname,
      referrer: page.referrer || document.referrer,
      ...page,
    };

    return this.track(EVENT_TYPES.VIEW_CONTENT, pageData, geoContext);
  }

  /**
   * Track click events
   */
  async trackClick(element, context = {}, geoContext = null) {
    const clickData = {
      element_tag: element.tagName,
      element_id: element.id,
      element_class: element.className,
      element_text: element.textContent?.substring(0, 100),
      element_href: element.href,
      x_position: context.x,
      y_position: context.y,
      ...context,
    };

    return this.track('click', clickData, geoContext);
  }

  /**
   * Track form submissions
   */
  async trackFormSubmit(form, context = {}, geoContext = null) {
    const formData = {
      form_id: form.id,
      form_action: form.action,
      form_method: form.method,
      field_count: form.elements.length,
      ...context,
    };

    return this.track('form_submit', formData, geoContext);
  }

  /**
   * Track scroll depth
   */
  async trackScrollDepth(percentage, geoContext = null) {
    return this.track('scroll_depth', {
      scroll_percentage: percentage,
      page_height: document.body.scrollHeight,
      viewport_height: window.innerHeight,
      scroll_position: window.scrollY,
    }, geoContext);
  }

  /**
   * Track video/media interactions
   */
  async trackMediaInteraction(mediaElement, action, context = {}, geoContext = null) {
    const mediaData = {
      media_type: mediaElement.tagName.toLowerCase(),
      media_src: mediaElement.src || mediaElement.currentSrc,
      media_duration: mediaElement.duration,
      media_current_time: mediaElement.currentTime,
      action: action, // play, pause, ended, etc.
      ...context,
    };

    return this.track('media_interaction', mediaData, geoContext);
  }

  /**
   * Track search with web-specific context
   */
  async trackSearch(query, results = [], filters = {}, geoContext = null) {
    return this.track(EVENT_TYPES.SEARCH, {
      search_query: query,
      result_count: results.length,
      filters,
      page_url: window.location.href,
      ...filters,
    }, geoContext);
  }

  /**
   * Track e-commerce events
   */
  async trackPurchase(transaction, geoContext = null) {
    return this.track('purchase', {
      transaction_id: transaction.id,
      total_amount: transaction.total,
      currency: transaction.currency,
      item_count: transaction.items?.length,
      items: transaction.items,
    }, geoContext);
  }

  /**
   * Auto-track common web interactions
   */
  enableAutoTracking(options = {}) {
    const {
      clicks = true,
      scrollDepth = true,
      formSubmits = true,
      pageViews = true,
    } = options;

    if (clicks) {
      document.addEventListener('click', (event) => {
        this.trackClick(event.target, {
          x: event.clientX,
          y: event.clientY,
        });
      });
    }

    if (scrollDepth) {
      let maxScrolled = 0;
      const scrollThresholds = [25, 50, 75, 90, 100];
      
      window.addEventListener('scroll', () => {
        const scrolled = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        
        if (scrolled > maxScrolled) {
          maxScrolled = scrolled;
          const threshold = scrollThresholds.find(t => scrolled >= t && maxScrolled < t);
          if (threshold) {
            this.trackScrollDepth(threshold);
          }
        }
      });
    }

    if (formSubmits) {
      document.addEventListener('submit', (event) => {
        this.trackFormSubmit(event.target);
      });
    }

    if (pageViews) {
      // Track initial page view
      this.trackPageView();
      
      // Track SPA navigation if History API is used
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => this.trackPageView(), 0);
      }.bind(this);
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => this.trackPageView(), 0);
      }.bind(this);
      
      window.addEventListener('popstate', () => {
        this.trackPageView();
      });
    }
  }

  /**
   * Send events using sendBeacon for reliability during page unload
   */
  _sendBeacon() {
    if (this.pendingEvents.length === 0 || !navigator.sendBeacon) {
      return;
    }

    const payload = JSON.stringify({
      client_id: this.config.clientId,
      events: this.pendingEvents,
    });

    const success = navigator.sendBeacon(this.config.endpoint, payload);
    
    if (success) {
      this.pendingEvents = [];
      this._savePendingEvents();
    }
  }

  /**
   * Clean up web-specific resources
   */
  cleanup() {
    super.cleanup();
    
    if (this.visibilityChangeListener) {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      this.visibilityChangeListener = null;
    }
    
    if (this.beforeUnloadListener) {
      window.removeEventListener('beforeunload', this.beforeUnloadListener);
      this.beforeUnloadListener = null;
    }
  }
}

// Global API for browser usage
if (typeof window !== 'undefined') {
  window.VibeMesh = new VibeMeshWeb();
  window.vibemesh = window.VibeMesh; // Lowercase alias
}

// Export for module usage
export default VibeMeshWeb;
export { VibeMeshWeb, EVENT_TYPES };