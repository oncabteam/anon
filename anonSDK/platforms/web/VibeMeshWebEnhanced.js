/**
 * VibeMesh Enhanced Web SDK
 * Comprehensive automatic event tracking for web applications
 * @version 1.0.0
 */

import { VibeMeshCore, EVENT_TYPES } from '../../core/VibeMeshCore';

/**
 * Enhanced Web Storage Implementation
 */
class EnhancedWebStorage {
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
 * Enhanced Web Network Implementation
 */
class EnhancedWebNetwork {
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
            'User-Agent': 'VibeMesh-Web-Enhanced/1.0.0',
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
 * Enhanced Web Geolocation Implementation
 */
class EnhancedWebGeo {
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
          maximumAge: 300000,
        }
      );
    });
  }
}

/**
 * Enhanced VibeMesh Web SDK with Comprehensive Auto-Tracking
 */
class VibeMeshWebEnhanced extends VibeMeshCore {
  constructor() {
    super();
    this.pageLoadTime = Date.now();
    this.autoTrackingOptions = {
      pageViews: true,
      clicks: true,
      scrollDepth: true,
      formSubmits: true,
      videoInteractions: true,
      downloads: true,
      linkClicks: true,
      errorTracking: true,
      performanceTracking: true,
      searchTracking: true,
      ecommerce: true
    };
    
    // Tracking state
    this.scrollDepthReached = new Set();
    this.videosTracked = new WeakMap();
    this.formsTracked = new WeakSet();
    this.performanceTracked = false;
    
    // Observers
    this.intersectionObserver = null;
    this.mutationObserver = null;
  }

  async init(config = {}) {
    // Set platform-specific implementations
    const webConfig = {
      ...config,
      platform: 'web',
      storage: new EnhancedWebStorage(),
      network: new EnhancedWebNetwork(),
      geoImplementation: config.geo ? new EnhancedWebGeo() : null,
    };

    await super.init(webConfig);

    // Merge auto-tracking options
    if (config.autoTracking && typeof config.autoTracking === 'object') {
      this.autoTrackingOptions = { ...this.autoTrackingOptions, ...config.autoTracking };
    }

    // Set up enhanced web handlers
    this._setupEnhancedWebHandlers();
    
    // Start comprehensive auto-tracking
    this._startAutoTracking();
    
    // Track initial page load with enhanced data
    this._trackEnhancedPageLoad();
  }

  _setupEnhancedWebHandlers() {
    // Page visibility change handler
    this.visibilityChangeListener = () => {
      if (document.hidden) {
        this.track(EVENT_TYPES.APP_BACKGROUND, {
          visibility_state: document.visibilityState,
          session_duration: Date.now() - this.pageLoadTime,
          session_id: this.getSessionId(),
        });
        this._sendBeacon();
      } else {
        this.track(EVENT_TYPES.APP_OPEN, {
          visibility_state: document.visibilityState,
          session_id: this.getSessionId(),
        });
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeListener);

    // Enhanced before unload handler
    this.beforeUnloadListener = () => {
      this.track(EVENT_TYPES.SESSION_END, {
        session_duration: Date.now() - this.pageLoadTime,
        session_id: this.getSessionId(),
        page_url: window.location.href,
        referrer: document.referrer,
      });
      this._sendBeacon();
    };
    
    window.addEventListener('beforeunload', this.beforeUnloadListener);

    // Error tracking
    if (this.autoTrackingOptions.errorTracking) {
      this._setupErrorTracking();
    }

    // Performance tracking
    if (this.autoTrackingOptions.performanceTracking) {
      this._setupPerformanceTracking();
    }
  }

  _startAutoTracking() {
    // Page views
    if (this.autoTrackingOptions.pageViews) {
      this._setupPageViewTracking();
    }

    // Click tracking
    if (this.autoTrackingOptions.clicks || this.autoTrackingOptions.linkClicks) {
      this._setupClickTracking();
    }

    // Scroll depth tracking
    if (this.autoTrackingOptions.scrollDepth) {
      this._setupScrollTracking();
    }

    // Form tracking
    if (this.autoTrackingOptions.formSubmits) {
      this._setupFormTracking();
    }

    // Video interaction tracking
    if (this.autoTrackingOptions.videoInteractions) {
      this._setupVideoTracking();
    }

    // Download tracking
    if (this.autoTrackingOptions.downloads) {
      this._setupDownloadTracking();
    }

    // Search tracking
    if (this.autoTrackingOptions.searchTracking) {
      this._setupSearchTracking();
    }

    // E-commerce tracking
    if (this.autoTrackingOptions.ecommerce) {
      this._setupEcommerceTracking();
    }

    // Set up mutation observer for dynamic content
    this._setupMutationObserver();
  }

  _trackEnhancedPageLoad() {
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      path: window.location.pathname,
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
      connection_type: navigator.connection?.effectiveType,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      java_enabled: navigator.javaEnabled?.() || false,
    };

    this.track(EVENT_TYPES.APP_OPEN, pageInfo);
  }

  _setupPageViewTracking() {
    // Track initial page view
    this.trackPageView();
    
    // Track SPA navigation
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

  _setupClickTracking() {
    document.addEventListener('click', (event) => {
      const element = event.target;
      
      // Enhanced click data
      const clickData = {
        element_tag: element.tagName.toLowerCase(),
        element_id: element.id || '',
        element_class: element.className || '',
        element_text: this._getElementText(element).substring(0, 100),
        element_href: element.href || '',
        element_type: element.type || '',
        x_position: event.clientX,
        y_position: event.clientY,
        page_x: event.pageX,
        page_y: event.pageY,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        modifier_keys: {
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey
        }
      };

      // Link click tracking
      if (this.autoTrackingOptions.linkClicks && element.href) {
        this._trackLinkClick(element, clickData);
      } else if (this.autoTrackingOptions.clicks) {
        this.track('click', clickData);
      }
    });
  }

  _setupScrollTracking() {
    let ticking = false;
    const scrollThresholds = [25, 50, 75, 90, 100];

    const trackScroll = () => {
      const scrolled = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      scrollThresholds.forEach(threshold => {
        if (scrolled >= threshold && !this.scrollDepthReached.has(threshold)) {
          this.scrollDepthReached.add(threshold);
          this.track('scroll_depth', {
            scroll_percentage: threshold,
            page_height: document.body.scrollHeight,
            viewport_height: window.innerHeight,
            scroll_position: window.scrollY,
            time_to_depth: Date.now() - this.pageLoadTime
          });
        }
      });
      
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(trackScroll);
        ticking = true;
      }
    });
  }

  _setupFormTracking() {
    const trackForm = (form, action) => {
      if (this.formsTracked.has(form)) return;
      this.formsTracked.add(form);

      const formData = {
        form_id: form.id || '',
        form_action: form.action || '',
        form_method: form.method || 'get',
        field_count: form.elements.length,
        form_name: form.name || '',
        action_type: action,
        page_url: window.location.href
      };

      // Add field information (without values for privacy)
      const fieldTypes = Array.from(form.elements).map(el => el.type || el.tagName.toLowerCase());
      formData.field_types = fieldTypes.join(',');

      this.track('form_interaction', formData);
    };

    // Track form submissions
    document.addEventListener('submit', (event) => {
      trackForm(event.target, 'submit');
    });

    // Track form field interactions
    document.addEventListener('focus', (event) => {
      if (event.target.form) {
        trackForm(event.target.form, 'field_focus');
      }
    }, true);
  }

  _setupVideoTracking() {
    const trackVideo = (video, action, currentTime = 0) => {
      if (!this.videosTracked.has(video)) {
        this.videosTracked.set(video, { tracked_milestones: new Set() });
      }

      const videoData = {
        video_src: video.src || video.currentSrc || '',
        video_duration: video.duration || 0,
        video_current_time: currentTime,
        action: action,
        video_width: video.videoWidth || 0,
        video_height: video.videoHeight || 0,
        video_id: video.id || '',
        page_url: window.location.href
      };

      this.track('video_interaction', videoData);

      // Track viewing milestones
      if (action === 'timeupdate' && video.duration > 0) {
        const percentage = Math.round((currentTime / video.duration) * 100);
        const milestones = [25, 50, 75, 95];
        const tracked = this.videosTracked.get(video).tracked_milestones;

        milestones.forEach(milestone => {
          if (percentage >= milestone && !tracked.has(milestone)) {
            tracked.add(milestone);
            this.track('video_milestone', {
              ...videoData,
              milestone_percentage: milestone
            });
          }
        });
      }
    };

    // Event delegation for videos
    document.addEventListener('play', (event) => {
      if (event.target.tagName === 'VIDEO') {
        trackVideo(event.target, 'play', event.target.currentTime);
      }
    });

    document.addEventListener('pause', (event) => {
      if (event.target.tagName === 'VIDEO') {
        trackVideo(event.target, 'pause', event.target.currentTime);
      }
    });

    document.addEventListener('ended', (event) => {
      if (event.target.tagName === 'VIDEO') {
        trackVideo(event.target, 'ended', event.target.currentTime);
      }
    });

    document.addEventListener('timeupdate', (event) => {
      if (event.target.tagName === 'VIDEO') {
        trackVideo(event.target, 'timeupdate', event.target.currentTime);
      }
    });
  }

  _setupDownloadTracking() {
    document.addEventListener('click', (event) => {
      const element = event.target;
      if (element.href && this._isDownloadLink(element.href)) {
        this.track('download', {
          download_url: element.href,
          file_name: this._getFileNameFromUrl(element.href),
          file_extension: this._getFileExtension(element.href),
          link_text: this._getElementText(element),
          page_url: window.location.href
        });
      }
    });
  }

  _setupSearchTracking() {
    // Track search form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      const searchInput = form.querySelector('input[type="search"], input[name*="search"], input[name*="query"], input[name*="q"]');
      
      if (searchInput && searchInput.value.trim()) {
        this.track('search', {
          search_query: searchInput.value.trim(),
          search_form_id: form.id || '',
          page_url: window.location.href
        });
      }
    });

    // Track search input interactions
    document.addEventListener('input', (event) => {
      const input = event.target;
      if (input.type === 'search' || 
          input.name?.includes('search') || 
          input.name?.includes('query') ||
          input.placeholder?.toLowerCase().includes('search')) {
        
        // Debounced search tracking
        clearTimeout(input._searchTimeout);
        input._searchTimeout = setTimeout(() => {
          if (input.value.trim().length >= 3) {
            this.track('search_input', {
              search_partial: input.value.trim(),
              input_length: input.value.length,
              page_url: window.location.href
            });
          }
        }, 1000);
      }
    });
  }

  _setupEcommerceTracking() {
    // Track add to cart (common button patterns)
    document.addEventListener('click', (event) => {
      const element = event.target;
      const text = this._getElementText(element).toLowerCase();
      
      if (text.includes('add to cart') || text.includes('add to bag') || 
          element.classList.contains('add-to-cart') ||
          element.getAttribute('data-action') === 'add-to-cart') {
        
        this.track('add_to_cart', {
          button_text: this._getElementText(element),
          product_id: this._extractProductId(element),
          page_url: window.location.href
        });
      }
      
      // Track purchase/checkout buttons
      if (text.includes('checkout') || text.includes('buy now') || text.includes('purchase')) {
        this.track('checkout_started', {
          button_text: this._getElementText(element),
          page_url: window.location.href
        });
      }
    });
  }

  _setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.track('javascript_error', {
        error_message: event.message,
        error_filename: event.filename,
        error_line: event.lineno,
        error_column: event.colno,
        page_url: window.location.href,
        user_agent: navigator.userAgent
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.track('promise_rejection', {
        error_message: event.reason?.toString() || 'Unknown promise rejection',
        page_url: window.location.href
      });
    });
  }

  _setupPerformanceTracking() {
    if (this.performanceTracked) return;
    this.performanceTracked = true;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = this._getPerformanceData();
        if (perfData) {
          this.track('page_performance', perfData);
        }
      }, 0);
    });
  }

  _setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Re-setup tracking for new videos
              if (this.autoTrackingOptions.videoInteractions) {
                const videos = node.querySelectorAll?.('video') || [];
                videos.forEach(video => {
                  // Videos will be tracked by event delegation
                });
              }
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Helper methods
  _getElementText(element) {
    return element.textContent || element.innerText || element.value || element.alt || element.title || '';
  }

  _isDownloadLink(url) {
    const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.exe', '.dmg', '.pkg'];
    return downloadExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  _getFileNameFromUrl(url) {
    return url.split('/').pop().split('?')[0];
  }

  _getFileExtension(url) {
    const fileName = this._getFileNameFromUrl(url);
    return fileName.includes('.') ? fileName.split('.').pop() : '';
  }

  _extractProductId(element) {
    return element.getAttribute('data-product-id') ||
           element.getAttribute('data-id') ||
           element.closest('[data-product-id]')?.getAttribute('data-product-id') ||
           '';
  }

  _trackLinkClick(element, clickData) {
    const linkData = {
      ...clickData,
      link_url: element.href,
      link_domain: new URL(element.href).hostname,
      is_external: new URL(element.href).hostname !== window.location.hostname,
      link_target: element.target || '',
      download_attribute: element.getAttribute('download') || ''
    };

    this.track('link_click', linkData);
  }

  _getPerformanceData() {
    if (!window.performance || !window.performance.timing) return null;

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    return {
      dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
      tcp_connection: timing.connectEnd - timing.connectStart,
      server_response: timing.responseEnd - timing.requestStart,
      dom_processing: timing.domComplete - timing.domLoading,
      page_load: timing.loadEventEnd - timing.navigationStart,
      navigation_type: navigation.type,
      redirect_count: navigation.redirectCount,
      page_url: window.location.href
    };
  }

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

  // Enhanced public API methods
  async trackPageView(page = {}, geoContext = null) {
    const pageData = {
      url: page.url || window.location.href,
      title: page.title || document.title,
      path: page.path || window.location.pathname,
      referrer: page.referrer || document.referrer,
      search: window.location.search,
      hash: window.location.hash,
      ...page,
    };

    return this.track(EVENT_TYPES.VIEW_CONTENT, pageData, geoContext);
  }

  // Enable/disable specific auto-tracking features
  setAutoTracking(options) {
    this.autoTrackingOptions = { ...this.autoTrackingOptions, ...options };
    
    // Restart auto-tracking with new options
    this._startAutoTracking();
  }

  // Clean up enhanced web-specific resources
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

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }
}

// Global API for browser usage with enhanced features
if (typeof window !== 'undefined') {
  window.VibeMesh = new VibeMeshWebEnhanced();
  window.vibemesh = window.VibeMesh; // Lowercase alias
  
  // Auto-initialize if API key is provided in meta tag
  const apiKeyMeta = document.querySelector('meta[name="vibemesh-api-key"]');
  if (apiKeyMeta) {
    window.addEventListener('DOMContentLoaded', () => {
      window.VibeMesh.init({
        clientId: apiKeyMeta.content,
        autoTracking: {
          pageViews: true,
          clicks: true,
          scrollDepth: true,
          formSubmits: true,
          videoInteractions: true,
          downloads: true,
          linkClicks: true,
          errorTracking: true,
          performanceTracking: true,
          searchTracking: true,
          ecommerce: true
        }
      });
    });
  }
}

// Export for module usage
export default VibeMeshWebEnhanced;
export { VibeMeshWebEnhanced, EVENT_TYPES };