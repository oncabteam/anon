/**
 * OnCabaret Anonymous Intent SDK - Web Platform
 * Browser-specific implementation with auto-tracking capabilities
 */

import AnonSDK, { INTENT_EVENT_TYPES } from '../core/AnonSDK.js';

// Web-specific event types
export const WEB_EVENT_TYPES = {
  ...INTENT_EVENT_TYPES,
  CLICK: 'click',
  FORM_SUBMIT: 'form_submit',
  SCROLL_MILESTONE: 'scroll_milestone',
  PAGE_UNLOAD: 'page_unload',
  MEDIA_PLAY: 'media_play',
  MEDIA_PAUSE: 'media_pause',
  DOWNLOAD: 'download',
  EXTERNAL_LINK: 'external_link'
};

// Storage implementation using localStorage
class WebStorage {
  async getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('LocalStorage not available:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('LocalStorage write failed:', error);
      return false;
    }
  }

  async removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('LocalStorage remove failed:', error);
      return false;
    }
  }
}

// Network implementation using fetch
class WebNetwork {
  constructor() {
    this.networkListeners = [];
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
  }

  _setupNetworkListening() {
    window.addEventListener('online', () => {
      this.networkListeners.forEach(callback => callback(true));
    });

    window.addEventListener('offline', () => {
      this.networkListeners.forEach(callback => callback(false));
    });
  }
}

// Geolocation implementation
class WebGeo {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

/**
 * Web-specific Anonymous Intent SDK
 */
export class AnonWebSDK extends AnonSDK {
  constructor() {
    super();
    this.autoTrackingEnabled = false;
    this.scrollDepthTracked = new Set();
    this.pageLoadTime = Date.now();
    this.lastScrollPosition = 0;
    this.formStartTimes = new Map();
  }

  /**
   * Initialize the web SDK with auto-tracking
   * @param {Object} config - Configuration options
   * @param {boolean} config.autoTracking - Enable automatic event tracking
   */
  async init(config = {}) {
    // Set up platform-specific implementations
    const webConfig = {
      ...config,
      platform: 'web',
      storage: new WebStorage(),
      network: new WebNetwork(),
      geo: new WebGeo()
    };

    await super.init(webConfig);

    // Set up auto-tracking if enabled
    if (config.autoTracking) {
      this.enableAutoTracking();
    }

    // Track initial page view
    await this.trackPageView();

    // Set up page unload tracking
    this._setupUnloadTracking();
  }

  /**
   * Enable automatic tracking of web interactions
   * @param {Object} options - Auto-tracking options
   */
  enableAutoTracking(options = {}) {
    const defaultOptions = {
      clicks: true,
      scrollDepth: true,
      formSubmits: true,
      mediaInteractions: true,
      downloads: true,
      externalLinks: true
    };

    const trackingOptions = { ...defaultOptions, ...options };
    this.autoTrackingEnabled = true;

    if (trackingOptions.clicks) {
      this._setupClickTracking();
    }

    if (trackingOptions.scrollDepth) {
      this._setupScrollTracking();
    }

    if (trackingOptions.formSubmits) {
      this._setupFormTracking();
    }

    if (trackingOptions.mediaInteractions) {
      this._setupMediaTracking();
    }

    if (trackingOptions.downloads) {
      this._setupDownloadTracking();
    }

    if (trackingOptions.externalLinks) {
      this._setupExternalLinkTracking();
    }

    this._log('Auto-tracking enabled with options:', trackingOptions);
  }

  /**
   * Disable automatic tracking
   */
  disableAutoTracking() {
    this.autoTrackingEnabled = false;
    // Remove event listeners would be implemented here
    this._log('Auto-tracking disabled');
  }

  /**
   * Track page view
   * @param {Object} properties - Page properties
   */
  async trackPageView(properties = {}) {
    const pageProperties = {
      page_url: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer,
      page_path: window.location.pathname,
      page_search: window.location.search,
      page_hash: window.location.hash,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      ...properties
    };

    return this.trackEvent(WEB_EVENT_TYPES.PAGE_VIEW, pageProperties);
  }

  /**
   * Track click interaction
   * @param {Element} element - Clicked element
   * @param {Object} properties - Additional properties
   */
  async trackClick(element, properties = {}) {
    const clickProperties = {
      element_tag: element.tagName.toLowerCase(),
      element_id: element.id || null,
      element_classes: element.className || null,
      element_text: element.textContent?.trim().substring(0, 100) || null,
      element_href: element.href || null,
      page_url: window.location.href,
      ...properties
    };

    return this.trackEvent(WEB_EVENT_TYPES.CLICK, clickProperties);
  }

  /**
   * Track scroll depth milestone
   * @param {number} percentage - Scroll percentage (25, 50, 75, 100)
   */
  async trackScrollDepth(percentage) {
    if (this.scrollDepthTracked.has(percentage)) {
      return;
    }

    this.scrollDepthTracked.add(percentage);

    const scrollProperties = {
      scroll_depth_percentage: percentage,
      page_url: window.location.href,
      time_to_scroll: Date.now() - this.pageLoadTime
    };

    return this.trackEvent(WEB_EVENT_TYPES.SCROLL_MILESTONE, scrollProperties);
  }

  /**
   * Track form interaction
   * @param {string} action - 'start', 'abandon', or 'submit'
   * @param {Element} form - Form element
   * @param {Object} properties - Additional properties
   */
  async trackFormInteraction(action, form, properties = {}) {
    const formId = form.id || 'anonymous_form';
    
    if (action === 'start') {
      this.formStartTimes.set(formId, Date.now());
    }

    const formProperties = {
      form_id: formId,
      form_action: form.action || null,
      form_method: form.method || 'get',
      field_count: form.elements.length,
      page_url: window.location.href,
      ...properties
    };

    if (action === 'submit' || action === 'abandon') {
      const startTime = this.formStartTimes.get(formId);
      if (startTime) {
        formProperties.completion_time = Date.now() - startTime;
        this.formStartTimes.delete(formId);
      }
    }

    const eventType = action === 'start' ? WEB_EVENT_TYPES.FORM_START :
                     action === 'abandon' ? WEB_EVENT_TYPES.FORM_ABANDON :
                     WEB_EVENT_TYPES.FORM_SUBMIT;

    return this.trackEvent(eventType, formProperties);
  }

  /**
   * Track media interaction
   * @param {Element} media - Video or audio element
   * @param {string} action - 'play', 'pause', 'ended', etc.
   * @param {Object} properties - Additional properties
   */
  async trackMediaInteraction(media, action, properties = {}) {
    const mediaProperties = {
      media_type: media.tagName.toLowerCase(),
      media_src: media.src || media.currentSrc || null,
      media_duration: media.duration || null,
      media_current_time: media.currentTime || null,
      media_action: action,
      page_url: window.location.href,
      ...properties
    };

    const eventType = action === 'play' ? WEB_EVENT_TYPES.MEDIA_PLAY :
                     action === 'pause' ? WEB_EVENT_TYPES.MEDIA_PAUSE :
                     WEB_EVENT_TYPES.CUSTOM;

    return this.trackEvent(eventType, mediaProperties);
  }

  // Private methods for auto-tracking setup

  _setupClickTracking() {
    document.addEventListener('click', (event) => {
      if (!this.autoTrackingEnabled) return;
      
      // Track with small delay to allow for navigation
      setTimeout(() => {
        this.trackClick(event.target);
      }, 100);
    }, true);
  }

  _setupScrollTracking() {
    let scrollTimeout;
    
    window.addEventListener('scroll', () => {
      if (!this.autoTrackingEnabled) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);

        // Track milestones at 25%, 50%, 75%, 100%
        [25, 50, 75, 100].forEach(milestone => {
          if (scrollPercent >= milestone) {
            this.trackScrollDepth(milestone);
          }
        });
      }, 250);
    });
  }

  _setupFormTracking() {
    // Track form starts
    document.addEventListener('focusin', (event) => {
      if (!this.autoTrackingEnabled) return;
      
      const form = event.target.closest('form');
      if (form && !this.formStartTimes.has(form.id || 'anonymous_form')) {
        this.trackFormInteraction('start', form);
      }
    });

    // Track form submits
    document.addEventListener('submit', (event) => {
      if (!this.autoTrackingEnabled) return;
      
      this.trackFormInteraction('submit', event.target);
    });

    // Track form abandons (page unload with started forms)
    window.addEventListener('beforeunload', () => {
      if (!this.autoTrackingEnabled) return;
      
      this.formStartTimes.forEach((startTime, formId) => {
        const form = document.getElementById(formId) || document.querySelector('form');
        if (form) {
          this.trackFormInteraction('abandon', form);
        }
      });
    });
  }

  _setupMediaTracking() {
    ['video', 'audio'].forEach(mediaType => {
      document.addEventListener('play', (event) => {
        if (!this.autoTrackingEnabled) return;
        if (event.target.tagName.toLowerCase() === mediaType) {
          this.trackMediaInteraction(event.target, 'play');
        }
      }, true);

      document.addEventListener('pause', (event) => {
        if (!this.autoTrackingEnabled) return;
        if (event.target.tagName.toLowerCase() === mediaType) {
          this.trackMediaInteraction(event.target, 'pause');
        }
      }, true);
    });
  }

  _setupDownloadTracking() {
    document.addEventListener('click', (event) => {
      if (!this.autoTrackingEnabled) return;
      
      const link = event.target.closest('a');
      if (link && link.href) {
        const url = new URL(link.href, window.location.href);
        const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.mp3', '.mp4', '.avi'];
        
        if (downloadExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext))) {
          this.trackEvent(WEB_EVENT_TYPES.DOWNLOAD, {
            download_url: link.href,
            download_text: link.textContent?.trim() || null,
            page_url: window.location.href
          });
        }
      }
    });
  }

  _setupExternalLinkTracking() {
    document.addEventListener('click', (event) => {
      if (!this.autoTrackingEnabled) return;
      
      const link = event.target.closest('a');
      if (link && link.href) {
        const linkUrl = new URL(link.href, window.location.href);
        const currentHost = window.location.hostname;
        
        if (linkUrl.hostname !== currentHost) {
          this.trackEvent(WEB_EVENT_TYPES.EXTERNAL_LINK, {
            external_url: link.href,
            external_domain: linkUrl.hostname,
            link_text: link.textContent?.trim() || null,
            page_url: window.location.href
          });
        }
      }
    });
  }

  _setupUnloadTracking() {
    const trackPageUnload = () => {
      const unloadData = {
        page_url: window.location.href,
        time_on_page: Date.now() - this.pageLoadTime,
        scroll_depth_max: Math.max(...this.scrollDepthTracked, 0)
      };

      // Use sendBeacon for reliability during page unload
      if (navigator.sendBeacon && this.config.restEndpoint) {
        const payload = {
          apiKey: this.config.apiKey,
          events: [{
            eventId: 'unload-' + Date.now(),
            eventName: WEB_EVENT_TYPES.PAGE_UNLOAD,
            anonId: this.anonId,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            properties: unloadData,
            platform: 'web'
          }]
        };

        navigator.sendBeacon(this.config.restEndpoint, JSON.stringify(payload));
      }
    };

    window.addEventListener('beforeunload', trackPageUnload);
    window.addEventListener('pagehide', trackPageUnload);
  }
}

// Convenience function for easy initialization
export function initAnonSDK(config) {
  const sdk = new AnonWebSDK();
  return sdk.init(config).then(() => sdk);
}

// Export event types for convenience
export { WEB_EVENT_TYPES as EVENT_TYPES };

export default AnonWebSDK;