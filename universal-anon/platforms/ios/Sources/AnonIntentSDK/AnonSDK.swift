/**
 * OnCabaret Anonymous Intent Graph SDK for iOS
 * Privacy-first analytics platform for behavioral signals
 */

import Foundation
import CoreLocation
import UserNotifications
import UIKit

// MARK: - Event Types

public enum IntentEventType: String, CaseIterable {
    // Behavioral Signals
    case tapToSave = "tap_to_save"
    case hover = "hover"
    case swipeLeft = "swipe_left"
    case swipeRight = "swipe_right"
    case scrollDepth = "scroll_depth"
    case zoomIn = "zoom_in"
    case zoomOut = "zoom_out"
    case longPress = "long_press"
    
    // Navigation & Discovery
    case pageView = "page_view"
    case search = "search"
    case filterApply = "filter_apply"
    case categoryBrowse = "category_browse"
    
    // Engagement Signals
    case contentView = "content_view"
    case contentShare = "content_share"
    case contentSave = "content_save"
    case formStart = "form_start"
    case formAbandon = "form_abandon"
    case formComplete = "form_complete"
    
    // Session & Lifecycle
    case sessionStart = "session_start"
    case sessionEnd = "session_end"
    case sessionIdle = "session_idle"
    case appBackground = "app_background"
    case appForeground = "app_foreground"
    
    // Intent Indicators
    case purchaseIntent = "purchase_intent"
    case browseIntent = "browse_intent"
    case compareIntent = "compare_intent"
    case exitIntent = "exit_intent"
    
    // iOS Specific
    case viewController = "view_controller"
    case deepLink = "deep_link"
    case pushNotification = "push_notification"
    case screenTime = "screen_time"
    
    // Custom
    case custom = "custom"
}

// MARK: - Configuration

public struct AnonSDKConfiguration {
    public let apiKey: String
    public let endpoint: String
    public let restEndpoint: String
    public let environment: Environment
    public let batchSize: Int
    public let flushInterval: TimeInterval
    public let debugMode: Bool
    public let onConsent: () -> Bool
    public let privacy: PrivacySettings
    
    public enum Environment: String {
        case production = "production"
        case staging = "staging"
        case development = "development"
    }
    
    public struct PrivacySettings {
        public let anonymizeLocation: Bool
        public let sessionTimeout: TimeInterval
        public let dataRetention: TimeInterval
        
        public init(
            anonymizeLocation: Bool = true,
            sessionTimeout: TimeInterval = 30 * 60, // 30 minutes
            dataRetention: TimeInterval = 365 * 24 * 60 * 60 // 365 days
        ) {
            self.anonymizeLocation = anonymizeLocation
            self.sessionTimeout = sessionTimeout
            self.dataRetention = dataRetention
        }
    }
    
    public init(
        apiKey: String,
        endpoint: String = "https://api.oncabaret.com/intent/graphql",
        restEndpoint: String = "https://api.oncabaret.com/intent/event",
        environment: Environment = .production,
        batchSize: Int = 50,
        flushInterval: TimeInterval = 30.0,
        debugMode: Bool = false,
        onConsent: @escaping () -> Bool = { true },
        privacy: PrivacySettings = PrivacySettings()
    ) {
        self.apiKey = apiKey
        self.endpoint = endpoint
        self.restEndpoint = restEndpoint
        self.environment = environment
        self.batchSize = batchSize
        self.flushInterval = flushInterval
        self.debugMode = debugMode
        self.onConsent = onConsent
        self.privacy = privacy
    }
}

// MARK: - Event Models

public struct IntentEvent: Codable {
    public let eventId: String
    public let eventName: String
    public let anonId: String
    public let sessionId: String
    public let timestamp: Date
    public let properties: [String: Any]?
    public let deviceMeta: DeviceMeta?
    public let geo: GeoLocation?
    public let platform: String
    public let environment: String
    public let sdkVersion: String
    
    enum CodingKeys: String, CodingKey {
        case eventId, eventName, anonId, sessionId, timestamp
        case properties, deviceMeta, geo, platform, environment, sdkVersion
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        eventId = try container.decode(String.self, forKey: .eventId)
        eventName = try container.decode(String.self, forKey: .eventName)
        anonId = try container.decode(String.self, forKey: .anonId)
        sessionId = try container.decode(String.self, forKey: .sessionId)
        timestamp = try container.decode(Date.self, forKey: .timestamp)
        platform = try container.decode(String.self, forKey: .platform)
        environment = try container.decode(String.self, forKey: .environment)
        sdkVersion = try container.decode(String.self, forKey: .sdkVersion)
        
        // Handle optional complex objects
        deviceMeta = try container.decodeIfPresent(DeviceMeta.self, forKey: .deviceMeta)
        geo = try container.decodeIfPresent(GeoLocation.self, forKey: .geo)
        
        // Handle dictionary properties
        if let propertiesData = try container.decodeIfPresent(Data.self, forKey: .properties) {
            properties = try JSONSerialization.jsonObject(with: propertiesData) as? [String: Any]
        } else {
            properties = nil
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encode(eventId, forKey: .eventId)
        try container.encode(eventName, forKey: .eventName)
        try container.encode(anonId, forKey: .anonId)
        try container.encode(sessionId, forKey: .sessionId)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(platform, forKey: .platform)
        try container.encode(environment, forKey: .environment)
        try container.encode(sdkVersion, forKey: .sdkVersion)
        
        try container.encodeIfPresent(deviceMeta, forKey: .deviceMeta)
        try container.encodeIfPresent(geo, forKey: .geo)
        
        if let properties = properties {
            let propertiesData = try JSONSerialization.data(withJSONObject: properties)
            try container.encode(propertiesData, forKey: .properties)
        }
    }
}

public struct DeviceMeta: Codable {
    public let platform: String
    public let platformVersion: String
    public let deviceModel: String
    public let deviceName: String
    public let screenWidth: Double
    public let screenHeight: Double
    public let screenScale: Double
    public let language: String
    public let timezone: String
    public let isTablet: Bool
    public let appVersion: String?
    public let bundleId: String?
}

public struct GeoLocation: Codable {
    public let lat: Double
    public let lng: Double
    public let accuracy: Double?
    public let altitude: Double?
    public let heading: Double?
    public let speed: Double?
}

// MARK: - Main SDK Class

@objc public class AnonSDK: NSObject {
    
    // MARK: - Singleton
    
    @objc public static let shared = AnonSDK()
    
    // MARK: - Properties
    
    private var configuration: AnonSDKConfiguration?
    private var isInitialized = false
    private var anonId: String?
    private var sessionId: String?
    private var sessionStartTime: Date?
    private var pendingEvents: [IntentEvent] = []
    private var flushTimer: Timer?
    private var hasConsent = false
    
    // iOS-specific properties
    private let locationManager = CLLocationManager()
    private var currentLocation: CLLocation?
    private let notificationCenter = UNUserNotificationCenter.current()
    
    // Storage keys
    private enum StorageKeys {
        static let anonId = "AnonSDK.anonId"
        static let sessionId = "AnonSDK.sessionId"
        static let pendingEvents = "AnonSDK.pendingEvents"
        static let lastSync = "AnonSDK.lastSync"
        static let consentStatus = "AnonSDK.consentStatus"
    }
    
    // Constants
    private let sdkVersion = "1.0.0"
    private let platform = "iOS"
    
    // MARK: - Initialization
    
    private override init() {
        super.init()
        setupLocationManager()
        setupAppLifecycleNotifications()
    }
    
    // MARK: - Public API
    
    @objc public func initialize(configuration: AnonSDKConfiguration) async throws {
        guard !isInitialized else {
            log("SDK already initialized")
            return
        }
        
        self.configuration = configuration
        
        // Check consent
        hasConsent = await checkConsent()
        
        guard hasConsent else {
            log("User consent not granted, SDK will not track events")
            return
        }
        
        // Get or create anonymous ID
        anonId = await getOrCreateAnonId()
        
        // Start new session
        await startNewSession()
        
        // Load pending events
        await loadPendingEvents()
        
        // Start flush timer
        startFlushTimer()
        
        isInitialized = true
        
        // Track session start
        await trackEvent(.sessionStart, properties: [
            "session_id": sessionId ?? "",
            "platform": platform
        ])
        
        log("Anonymous Intent SDK initialized successfully")
    }
    
    @objc public func trackEvent(
        _ eventType: IntentEventType,
        properties: [String: Any] = [:],
        deviceMeta: DeviceMeta? = nil,
        geo: GeoLocation? = nil
    ) async -> String? {
        
        guard isInitialized && hasConsent else {
            log("SDK not initialized or consent not granted")
            return nil
        }
        
        guard let config = configuration,
              let anonId = anonId,
              let sessionId = sessionId else {
            log("SDK not properly configured")
            return nil
        }
        
        do {
            let eventId = UUID().uuidString
            
            let deviceMetaToUse = deviceMeta ?? await getDeviceMeta()
            let geoToUse = geo ?? await getCurrentLocation()
            
            let event = IntentEvent(
                eventId: eventId,
                eventName: eventType.rawValue,
                anonId: anonId,
                sessionId: sessionId,
                timestamp: Date(),
                properties: sanitizeProperties(properties),
                deviceMeta: deviceMetaToUse,
                geo: geoToUse,
                platform: platform,
                environment: config.environment.rawValue,
                sdkVersion: sdkVersion
            )
            
            pendingEvents.append(event)
            await savePendingEvents()
            
            log("Intent event tracked: \(eventType.rawValue)")
            
            // Trigger immediate flush if batch size reached
            if pendingEvents.count >= config.batchSize {
                await flushEvents()
            }
            
            return eventId
            
        } catch {
            log("Error tracking event: \(error)")
            return nil
        }
    }
    
    @objc public func flush() async {
        await flushEvents()
    }
    
    @objc public func setConsent(_ hasConsent: Bool) async {
        self.hasConsent = hasConsent
        UserDefaults.standard.set(hasConsent, forKey: StorageKeys.consentStatus)
        
        if !hasConsent {
            // Clear pending events and stop tracking
            pendingEvents.removeAll()
            await savePendingEvents()
            stopFlushTimer()
            log("Consent revoked, tracking stopped")
        } else if isInitialized {
            // Resume tracking
            startFlushTimer()
            log("Consent granted, tracking resumed")
        }
    }
    
    @objc public func hasUserConsent() -> Bool {
        return hasConsent
    }
    
    @objc public func getPendingEventsCount() -> Int {
        return pendingEvents.count
    }
    
    @objc public func getAnonId() -> String? {
        return anonId
    }
    
    @objc public func getSessionId() -> String? {
        return sessionId
    }
    
    @objc public func cleanup() {
        stopFlushTimer()
        NotificationCenter.default.removeObserver(self)
        isInitialized = false
        log("SDK cleaned up")
    }
    
    // MARK: - iOS-Specific Tracking Methods
    
    @objc public func trackViewController(
        _ viewController: UIViewController,
        properties: [String: Any] = [:]
    ) async -> String? {
        var props = properties
        props["view_controller"] = String(describing: type(of: viewController))
        props["screen"] = viewController.title ?? "Unknown"
        
        return await trackEvent(.viewController, properties: props)
    }
    
    @objc public func trackDeepLink(
        _ url: URL,
        properties: [String: Any] = [:]
    ) async -> String? {
        var props = properties
        props["deep_link_url"] = url.absoluteString
        props["deep_link_scheme"] = url.scheme
        props["deep_link_host"] = url.host
        
        return await trackEvent(.deepLink, properties: props)
    }
    
    @objc public func trackPushNotification(
        _ userInfo: [AnyHashable: Any],
        action: String,
        properties: [String: Any] = [:]
    ) async -> String? {
        var props = properties
        props["notification_action"] = action
        props["notification_data"] = userInfo
        
        return await trackEvent(.pushNotification, properties: props)
    }
    
    // MARK: - Private Methods
    
    private func checkConsent() async -> Bool {
        if UserDefaults.standard.object(forKey: StorageKeys.consentStatus) != nil {
            return UserDefaults.standard.bool(forKey: StorageKeys.consentStatus)
        }
        
        // Check with callback if no stored consent
        if let config = configuration {
            let consent = config.onConsent()
            UserDefaults.standard.set(consent, forKey: StorageKeys.consentStatus)
            return consent
        }
        
        return false
    }
    
    private func getOrCreateAnonId() async -> String {
        if let existingId = UserDefaults.standard.string(forKey: StorageKeys.anonId) {
            return existingId
        }
        
        let newId = "anon-\(UUID().uuidString)"
        UserDefaults.standard.set(newId, forKey: StorageKeys.anonId)
        return newId
    }
    
    private func startNewSession() async {
        sessionId = UUID().uuidString
        sessionStartTime = Date()
        
        if let sessionId = sessionId {
            UserDefaults.standard.set(sessionId, forKey: StorageKeys.sessionId)
        }
    }
    
    private func loadPendingEvents() async {
        guard let data = UserDefaults.standard.data(forKey: StorageKeys.pendingEvents),
              let events = try? JSONDecoder().decode([IntentEvent].self, from: data) else {
            pendingEvents = []
            return
        }
        
        pendingEvents = events
    }
    
    private func savePendingEvents() async {
        do {
            let data = try JSONEncoder().encode(pendingEvents)
            UserDefaults.standard.set(data, forKey: StorageKeys.pendingEvents)
        } catch {
            log("Error saving pending events: \(error)")
        }
    }
    
    private func flushEvents() async {
        guard let config = configuration,
              !pendingEvents.isEmpty && hasConsent else {
            return
        }
        
        let eventsToSend = Array(pendingEvents.prefix(config.batchSize))
        
        do {
            let success = try await sendEvents(eventsToSend)
            
            if success {
                // Remove sent events from pending list
                pendingEvents.removeFirst(min(eventsToSend.count, pendingEvents.count))
                await savePendingEvents()
                
                UserDefaults.standard.set(Date(), forKey: StorageKeys.lastSync)
                
                log("Successfully sent \(eventsToSend.count) intent events")
                
                // If more events pending, schedule next flush
                if !pendingEvents.isEmpty {
                    Task {
                        try await Task.sleep(nanoseconds: 100_000_000) // 100ms
                        await flushEvents()
                    }
                }
            }
        } catch {
            log("Error flushing events: \(error)")
        }
    }
    
    private func sendEvents(_ events: [IntentEvent]) async throws -> Bool {
        guard let config = configuration else { return false }
        
        let payload: [String: Any] = [
            "apiKey": config.apiKey,
            "events": events.compactMap { event in
                try? JSONEncoder().encode(event)
            }.compactMap { data in
                try? JSONSerialization.jsonObject(with: data)
            }
        ]
        
        var request = URLRequest(url: URL(string: config.restEndpoint)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(config.apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            return httpResponse.statusCode == 200
        }
        
        return false
    }
    
    private func getDeviceMeta() async -> DeviceMeta {
        let device = UIDevice.current
        let screen = UIScreen.main
        let bundle = Bundle.main
        
        return DeviceMeta(
            platform: platform,
            platformVersion: device.systemVersion,
            deviceModel: device.model,
            deviceName: device.name,
            screenWidth: Double(screen.bounds.width),
            screenHeight: Double(screen.bounds.height),
            screenScale: Double(screen.scale),
            language: Locale.current.languageCode ?? "unknown",
            timezone: TimeZone.current.identifier,
            isTablet: device.userInterfaceIdiom == .pad,
            appVersion: bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
            bundleId: bundle.bundleIdentifier
        )
    }
    
    private func getCurrentLocation() async -> GeoLocation? {
        guard let config = configuration,
              let location = currentLocation else {
            return nil
        }
        
        let coordinate = location.coordinate
        
        if config.privacy.anonymizeLocation {
            // Reduce precision to ~1km for privacy
            return GeoLocation(
                lat: round(coordinate.latitude * 100) / 100,
                lng: round(coordinate.longitude * 100) / 100,
                accuracy: location.horizontalAccuracy,
                altitude: location.altitude,
                heading: location.course >= 0 ? location.course : nil,
                speed: location.speed >= 0 ? location.speed : nil
            )
        } else {
            return GeoLocation(
                lat: coordinate.latitude,
                lng: coordinate.longitude,
                accuracy: location.horizontalAccuracy,
                altitude: location.altitude,
                heading: location.course >= 0 ? location.course : nil,
                speed: location.speed >= 0 ? location.speed : nil
            )
        }
    }
    
    private func sanitizeProperties(_ properties: [String: Any]) -> [String: Any] {
        var sanitized = properties
        
        // Remove common PII fields
        let piiFields = ["email", "phone", "name", "address", "creditCard", "ssn"]
        piiFields.forEach { sanitized.removeValue(forKey: $0) }
        
        return sanitized
    }
    
    private func startFlushTimer() {
        guard let config = configuration else { return }
        
        stopFlushTimer()
        
        flushTimer = Timer.scheduledTimer(withTimeInterval: config.flushInterval, repeats: true) { _ in
            Task {
                await self.flushEvents()
            }
        }
    }
    
    private func stopFlushTimer() {
        flushTimer?.invalidate()
        flushTimer = nil
    }
    
    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }
    
    private func setupAppLifecycleNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }
    
    @objc private func appDidEnterBackground() {
        Task {
            await trackEvent(.appBackground, properties: [
                "session_duration": Date().timeIntervalSince(sessionStartTime ?? Date())
            ])
            await flushEvents()
        }
    }
    
    @objc private func appWillEnterForeground() {
        Task {
            await trackEvent(.appForeground, properties: [:])
        }
    }
    
    private func log(_ message: String) {
        guard configuration?.debugMode == true else { return }
        print("[AnonSDK] \(message)")
    }
}

// MARK: - CLLocationManagerDelegate

extension AnonSDK: CLLocationManagerDelegate {
    
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        currentLocation = locations.last
    }
    
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        log("Location error: \(error)")
    }
    
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            log("Location access denied")
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        @unknown default:
            break
        }
    }
}

// MARK: - Convenience Methods

public extension AnonSDK {
    
    @objc convenience init(configuration: AnonSDKConfiguration) {
        self.init()
        Task {
            try await initialize(configuration: configuration)
        }
    }
    
    @objc func track(_ eventType: IntentEventType, properties: [String: Any] = [:]) {
        Task {
            await trackEvent(eventType, properties: properties)
        }
    }
}