import Foundation
import UIKit
import CoreLocation
import UserNotifications

/**
 * VibeMesh iOS Native SDK
 * Automatic event tracking for iOS apps with privacy-first design
 * @version 1.0.0
 */

public class VibeMesh: NSObject {
    
    // MARK: - Singleton
    public static let shared = VibeMesh()
    
    // MARK: - Configuration
    public struct Configuration {
        let apiKey: String
        let endpoint: String
        let enableGeolocation: Bool
        let enableAutoTracking: Bool
        let debugMode: Bool
        let batchSize: Int
        let flushInterval: TimeInterval
        
        public init(
            apiKey: String,
            endpoint: String = "https://api.vibemesh.io/events",
            enableGeolocation: Bool = false,
            enableAutoTracking: Bool = true,
            debugMode: Bool = false,
            batchSize: Int = 50,
            flushInterval: TimeInterval = 30.0
        ) {
            self.apiKey = apiKey
            self.endpoint = endpoint
            self.enableGeolocation = enableGeolocation
            self.enableAutoTracking = enableAutoTracking
            self.debugMode = debugMode
            self.batchSize = batchSize
            self.flushInterval = flushInterval
        }
    }
    
    // MARK: - Properties
    private var config: Configuration?
    private var isInitialized = false
    private var userId: String?
    private var sessionId: String?
    private var pendingEvents: [VibeMeshEvent] = []
    private var flushTimer: Timer?
    private var locationManager: CLLocationManager?
    private var currentLocation: CLLocation?
    private var isOptedOut = false
    
    // Auto-tracking state
    private var autoTrackingEnabled = false
    private var viewControllerSwizzled = false
    private var buttonActionSwizzled = false
    
    // MARK: - Storage Keys
    private enum StorageKeys {
        static let userId = "VibeMesh_userId"
        static let pendingEvents = "VibeMesh_pendingEvents"
        static let lastSync = "VibeMesh_lastSync"
        static let sessionId = "VibeMesh_sessionId"
        static let optOut = "VibeMesh_optOut"
    }
    
    // MARK: - Initialization
    public func initialize(config: Configuration) async throws {
        guard !isInitialized else {
            log("VibeMesh already initialized")
            return
        }
        
        self.config = config
        
        // Check opt-out status
        isOptedOut = UserDefaults.standard.bool(forKey: StorageKeys.optOut)
        if isOptedOut {
            log("User has opted out, SDK will not track events")
            return
        }
        
        // Get or create user ID
        userId = await getOrCreateUserId()
        
        // Create new session
        sessionId = UUID().uuidString
        UserDefaults.standard.set(sessionId, forKey: StorageKeys.sessionId)
        
        // Load pending events
        loadPendingEvents()
        
        // Setup location if enabled
        if config.enableGeolocation {
            setupLocationManager()
        }
        
        // Setup auto-tracking if enabled
        if config.enableAutoTracking {
            setupAutoTracking()
        }
        
        // Setup app lifecycle observers
        setupAppLifecycleObservers()
        
        // Start flush timer
        startFlushTimer()
        
        isInitialized = true
        
        // Track session start
        await track(eventType: "session_start", context: [
            "session_id": sessionId ?? "",
            "platform": "ios",
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            "os_version": UIDevice.current.systemVersion
        ])
        
        // Initial flush
        flush()
        
        log("VibeMesh iOS SDK initialized successfully")
    }
    
    // MARK: - Event Tracking
    public func track(eventType: String, context: [String: Any] = [:], geoContext: [String: Any]? = nil) async {
        guard isInitialized, !isOptedOut else {
            log("SDK not initialized or user opted out")
            return
        }
        
        var finalGeoContext = geoContext
        if finalGeoContext == nil && config?.enableGeolocation == true {
            finalGeoContext = getCurrentGeoContext()
        }
        
        let event = VibeMeshEvent(
            eventId: UUID().uuidString,
            eventType: eventType,
            entityId: context["entity_id"] as? String,
            timestamp: ISO8601DateFormatter().string(from: Date()),
            uuid: userId ?? "",
            sessionId: sessionId ?? "",
            clientId: config?.apiKey ?? "",
            platform: "ios",
            context: context,
            geoContext: finalGeoContext,
            tags: context["tags"] as? [String] ?? [],
            ttl: getTTLForEventType(eventType)
        )
        
        pendingEvents.append(event)
        savePendingEvents()
        
        log("Event tracked: \(eventType)")
        
        // Trigger flush if batch size reached
        if pendingEvents.count >= (config?.batchSize ?? 50) {
            flush()
        }
    }
    
    // MARK: - High-Level Tracking Methods
    public func trackScreenView(_ screenName: String, screenClass: String? = nil) async {
        await track(eventType: "screen_view", context: [
            "screen_name": screenName,
            "screen_class": screenClass ?? "Unknown"
        ])
    }
    
    public func trackButtonTap(_ buttonTitle: String, screenName: String? = nil) async {
        await track(eventType: "button_tap", context: [
            "button_title": buttonTitle,
            "screen_name": screenName ?? getCurrentScreenName()
        ])
    }
    
    public func trackSearch(query: String, resultCount: Int = 0, filters: [String: Any] = [:]) async {
        await track(eventType: "search", context: [
            "search_query": query,
            "result_count": resultCount,
            "filters": filters
        ])
    }
    
    public func trackPurchase(transactionId: String, amount: Double, currency: String, items: [[String: Any]] = []) async {
        await track(eventType: "purchase", context: [
            "transaction_id": transactionId,
            "amount": amount,
            "currency": currency,
            "items": items
        ])
    }
    
    public func trackContentView(contentId: String, contentType: String, contentName: String? = nil) async {
        await track(eventType: "content_view", context: [
            "content_id": contentId,
            "content_type": contentType,
            "content_name": contentName ?? ""
        ])
    }
    
    // MARK: - Auto-Tracking Setup
    private func setupAutoTracking() {
        guard !autoTrackingEnabled else { return }
        
        autoTrackingEnabled = true
        
        // Swizzle UIViewController methods for automatic screen tracking
        swizzleViewControllerMethods()
        
        // Swizzle UIControl methods for automatic button tracking
        swizzleButtonMethods()
        
        log("Auto-tracking enabled")
    }
    
    private func swizzleViewControllerMethods() {
        guard !viewControllerSwizzled else { return }
        
        let originalSelector = #selector(UIViewController.viewDidAppear(_:))
        let swizzledSelector = #selector(UIViewController.vibemesh_viewDidAppear(_:))
        
        guard let originalMethod = class_getInstanceMethod(UIViewController.self, originalSelector),
              let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSelector) else {
            return
        }
        
        method_exchangeImplementations(originalMethod, swizzledMethod)
        viewControllerSwizzled = true
    }
    
    private func swizzleButtonMethods() {
        guard !buttonActionSwizzled else { return }
        
        let originalSelector = #selector(UIControl.sendAction(_:to:for:))
        let swizzledSelector = #selector(UIControl.vibemesh_sendAction(_:to:for:))
        
        guard let originalMethod = class_getInstanceMethod(UIControl.self, originalSelector),
              let swizzledMethod = class_getInstanceMethod(UIControl.self, swizzledSelector) else {
            return
        }
        
        method_exchangeImplementations(originalMethod, swizzledMethod)
        buttonActionSwizzled = true
    }
    
    // MARK: - Location Management
    private func setupLocationManager() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyHundredMeters
        
        // Request permission
        switch locationManager?.authorizationStatus {
        case .notDetermined:
            locationManager?.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager?.startUpdatingLocation()
        default:
            break
        }
    }
    
    private func getCurrentGeoContext() -> [String: Any]? {
        guard let location = currentLocation else { return nil }
        
        return [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "timestamp": ISO8601DateFormatter().string(from: location.timestamp)
        ]
    }
    
    // MARK: - App Lifecycle
    private func setupAppLifecycleObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillTerminate),
            name: UIApplication.willTerminateNotification,
            object: nil
        )
    }
    
    @objc private func appDidBecomeActive() {
        Task {
            await track(eventType: "app_foreground", context: [
                "session_id": sessionId ?? ""
            ])
            flush()
        }
    }
    
    @objc private func appDidEnterBackground() {
        Task {
            await track(eventType: "app_background", context: [
                "session_id": sessionId ?? ""
            ])
            flush()
        }
    }
    
    @objc private func appWillTerminate() {
        Task {
            await track(eventType: "app_terminate", context: [
                "session_id": sessionId ?? ""
            ])
            flush()
        }
    }
    
    // MARK: - Sync and Storage
    public func flush() {
        guard !pendingEvents.isEmpty else { return }
        
        let eventsToSend = Array(pendingEvents.prefix(config?.batchSize ?? 50))
        
        Task {
            do {
                let success = try await sendEvents(eventsToSend)
                if success {
                    // Remove sent events
                    pendingEvents.removeFirst(eventsToSend.count)
                    savePendingEvents()
                    
                    // Update last sync time
                    UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: StorageKeys.lastSync)
                    
                    log("Successfully sent \(eventsToSend.count) events")
                    
                    // Continue flushing if more events
                    if !pendingEvents.isEmpty {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            self.flush()
                        }
                    }
                }
            } catch {
                log("Error flushing events: \(error)")
            }
        }
    }
    
    private func sendEvents(_ events: [VibeMeshEvent]) async throws -> Bool {
        guard let config = config,
              let url = URL(string: config.endpoint) else {
            throw VibeMeshError.invalidConfiguration
        }
        
        let payload: [String: Any] = [
            "client_id": config.apiKey,
            "events": events.map { $0.toDictionary() }
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("VibeMesh-iOS/1.0.0", forHTTPHeaderField: "User-Agent")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            return httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
        }
        
        return false
    }
    
    // MARK: - Privacy Controls
    public func optOut() async {
        isOptedOut = true
        UserDefaults.standard.set(true, forKey: StorageKeys.optOut)
        
        // Clear pending events
        pendingEvents.removeAll()
        savePendingEvents()
        
        // Stop timer
        flushTimer?.invalidate()
        flushTimer = nil
        
        log("User opted out of tracking")
    }
    
    public func optIn() async {
        isOptedOut = false
        UserDefaults.standard.set(false, forKey: StorageKeys.optOut)
        
        if isInitialized {
            startFlushTimer()
        }
        
        log("User opted back into tracking")
    }
    
    public func isOptedOutStatus() -> Bool {
        return isOptedOut
    }
    
    // MARK: - Utility Methods
    public func getPendingEventsCount() -> Int {
        return pendingEvents.count
    }
    
    public func getUserId() -> String? {
        return userId
    }
    
    public func getSessionId() -> String? {
        return sessionId
    }
    
    // MARK: - Private Methods
    private func getOrCreateUserId() async -> String {
        if let existingUserId = UserDefaults.standard.string(forKey: StorageKeys.userId) {
            return existingUserId
        }
        
        let newUserId = "anon-\(UUID().uuidString)"
        UserDefaults.standard.set(newUserId, forKey: StorageKeys.userId)
        return newUserId
    }
    
    private func loadPendingEvents() {
        if let data = UserDefaults.standard.data(forKey: StorageKeys.pendingEvents),
           let events = try? JSONDecoder().decode([VibeMeshEvent].self, from: data) {
            pendingEvents = events
        }
    }
    
    private func savePendingEvents() {
        if let data = try? JSONEncoder().encode(pendingEvents) {
            UserDefaults.standard.set(data, forKey: StorageKeys.pendingEvents)
        }
    }
    
    private func startFlushTimer() {
        flushTimer?.invalidate()
        flushTimer = Timer.scheduledTimer(withTimeInterval: config?.flushInterval ?? 30.0, repeats: true) { _ in
            self.flush()
        }
    }
    
    private func getTTLForEventType(_ eventType: String) -> Int {
        switch eventType {
        case "screen_view", "button_tap":
            return 180 * 24 * 60 * 60 // 180 days
        case "purchase":
            return 365 * 24 * 60 * 60 // 365 days
        case "search":
            return 90 * 24 * 60 * 60 // 90 days
        case "app_foreground", "app_background":
            return 30 * 24 * 60 * 60 // 30 days
        default:
            return 90 * 24 * 60 * 60 // 90 days default
        }
    }
    
    private func getCurrentScreenName() -> String {
        if let topViewController = UIApplication.shared.keyWindow?.rootViewController?.topMostViewController() {
            return String(describing: type(of: topViewController))
        }
        return "Unknown"
    }
    
    private func log(_ message: String) {
        if config?.debugMode == true {
            print("[VibeMesh] \(message)")
        }
    }
}

// MARK: - CLLocationManagerDelegate
extension VibeMesh: CLLocationManagerDelegate {
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        currentLocation = locations.last
    }
    
    public func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        switch status {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            log("Location permission denied")
        default:
            break
        }
    }
}

// MARK: - Supporting Types
public struct VibeMeshEvent: Codable {
    let eventId: String
    let eventType: String
    let entityId: String?
    let timestamp: String
    let uuid: String
    let sessionId: String
    let clientId: String
    let platform: String
    let context: [String: Any]
    let geoContext: [String: Any]?
    let tags: [String]
    let ttl: Int
    
    enum CodingKeys: String, CodingKey {
        case eventId = "event_id"
        case eventType = "event_type"
        case entityId = "entity_id"
        case timestamp, uuid
        case sessionId = "session_id"
        case clientId = "client_id"
        case platform, context
        case geoContext = "geo_context"
        case tags, ttl
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(eventId, forKey: .eventId)
        try container.encode(eventType, forKey: .eventType)
        try container.encodeIfPresent(entityId, forKey: .entityId)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(uuid, forKey: .uuid)
        try container.encode(sessionId, forKey: .sessionId)
        try container.encode(clientId, forKey: .clientId)
        try container.encode(platform, forKey: .platform)
        try container.encode(tags, forKey: .tags)
        try container.encode(ttl, forKey: .ttl)
        
        // Handle Any types
        if let contextData = try? JSONSerialization.data(withJSONObject: context),
           let contextString = String(data: contextData, encoding: .utf8) {
            try container.encode(contextString, forKey: .context)
        }
        
        if let geoContext = geoContext,
           let geoData = try? JSONSerialization.data(withJSONObject: geoContext),
           let geoString = String(data: geoData, encoding: .utf8) {
            try container.encode(geoString, forKey: .geoContext)
        }
    }
    
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "event_id": eventId,
            "event_type": eventType,
            "timestamp": timestamp,
            "uuid": uuid,
            "session_id": sessionId,
            "client_id": clientId,
            "platform": platform,
            "context": context,
            "tags": tags,
            "ttl": ttl
        ]
        
        if let entityId = entityId {
            dict["entity_id"] = entityId
        }
        
        if let geoContext = geoContext {
            dict["geo_context"] = geoContext
        }
        
        return dict
    }
}

public enum VibeMeshError: Error {
    case invalidConfiguration
    case notInitialized
    case optedOut
}

// MARK: - UIViewController Extension for Auto-Tracking
extension UIViewController {
    @objc func vibemesh_viewDidAppear(_ animated: Bool) {
        self.vibemesh_viewDidAppear(animated)
        
        // Track screen view
        let screenName = String(describing: type(of: self))
        Task {
            await VibeMesh.shared.trackScreenView(screenName, screenClass: screenName)
        }
    }
}

// MARK: - UIControl Extension for Auto-Tracking
extension UIControl {
    @objc func vibemesh_sendAction(_ action: Selector, to target: Any?, for event: UIEvent?) {
        self.vibemesh_sendAction(action, to: target, for: event)
        
        // Track button tap
        if let button = self as? UIButton,
           let title = button.title(for: .normal) ?? button.titleLabel?.text {
            Task {
                await VibeMesh.shared.trackButtonTap(title)
            }
        }
    }
}

// MARK: - UIViewController Helper
extension UIViewController {
    func topMostViewController() -> UIViewController {
        if let presentedViewController = presentedViewController {
            return presentedViewController.topMostViewController()
        }
        
        if let navigationController = self as? UINavigationController {
            return navigationController.visibleViewController?.topMostViewController() ?? self
        }
        
        if let tabBarController = self as? UITabBarController {
            return tabBarController.selectedViewController?.topMostViewController() ?? self
        }
        
        return self
    }
}