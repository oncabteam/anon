/**
 * iOS Example App for OnCabaret Anonymous Intent SDK
 * Demonstrates integration and usage patterns
 */

import SwiftUI
import AnonIntentSDK

struct ContentView: View {
    @StateObject private var viewModel = ContentViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 10) {
                        Image(systemName: "chart.bar.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)
                        
                        Text("🎯 Anonymous Intent SDK")
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Text("Privacy-first behavioral analytics")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    
                    // SDK Status
                    StatusCard(
                        title: "SDK Status",
                        value: viewModel.sdkStatus,
                        color: viewModel.isInitialized ? .green : .orange
                    )
                    
                    // Consent Management
                    ConsentSection(viewModel: viewModel)
                    
                    // Live Metrics
                    MetricsSection(viewModel: viewModel)
                    
                    // Event Tracking Demo
                    EventTrackingSection(viewModel: viewModel)
                    
                    // iOS-Specific Features
                    IOSFeaturesSection(viewModel: viewModel)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Anon SDK Demo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Flush Events") {
                        Task {
                            await viewModel.flushEvents()
                        }
                    }
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.initializeSDK()
            }
        }
    }
}

// MARK: - Consent Section

struct ConsentSection: View {
    @ObservedObject var viewModel: ContentViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "lock.shield")
                    .foregroundColor(.green)
                Text("Privacy & Consent")
                    .font(.headline)
                Spacer()
            }
            
            HStack {
                Text("Consent Status:")
                    .foregroundColor(.secondary)
                Spacer()
                Text(viewModel.hasConsent ? "Granted ✅" : "Revoked ❌")
                    .foregroundColor(viewModel.hasConsent ? .green : .red)
                    .fontWeight(.medium)
            }
            
            HStack(spacing: 10) {
                Button("Grant Consent") {
                    Task {
                        await viewModel.setConsent(true)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                
                Button("Revoke Consent") {
                    Task {
                        await viewModel.setConsent(false)
                    }
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Metrics Section

struct MetricsSection: View {
    @ObservedObject var viewModel: ContentViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.blue)
                Text("Live Session Metrics")
                    .font(.headline)
                Spacer()
            }
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 10) {
                MetricCard(
                    title: "Events Tracked",
                    value: "\(viewModel.eventsTracked)",
                    icon: "number"
                )
                
                MetricCard(
                    title: "Session Time",
                    value: viewModel.sessionTime,
                    icon: "clock"
                )
                
                MetricCard(
                    title: "Pending Events",
                    value: "\(viewModel.pendingEvents)",
                    icon: "tray"
                )
                
                MetricCard(
                    title: "Anonymous ID",
                    value: viewModel.anonymousId,
                    icon: "person.badge.key"
                )
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Event Tracking Section

struct EventTrackingSection: View {
    @ObservedObject var viewModel: ContentViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "target")
                    .foregroundColor(.purple)
                Text("Event Tracking Demo")
                    .font(.headline)
                Spacer()
            }
            
            Text("Try these interactions to see anonymous intent tracking:")
                .font(.caption)
                .foregroundColor(.secondary)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 10) {
                EventButton(
                    title: "Tap to Save",
                    icon: "heart.fill",
                    color: .red
                ) {
                    await viewModel.trackEvent(.tapToSave, properties: [
                        "item_id": "demo_item_1",
                        "category": "demo"
                    ])
                }
                
                EventButton(
                    title: "Purchase Intent",
                    icon: "cart.fill",
                    color: .green
                ) {
                    await viewModel.trackEvent(.purchaseIntent, properties: [
                        "product_category": "demo",
                        "price_range": "medium"
                    ])
                }
                
                EventButton(
                    title: "Search Query",
                    icon: "magnifyingglass",
                    color: .blue
                ) {
                    await viewModel.trackEvent(.search, properties: [
                        "search_query": "coffee shops near me",
                        "results_count": 12
                    ])
                }
                
                EventButton(
                    title: "Content Share",
                    icon: "square.and.arrow.up",
                    color: .orange
                ) {
                    await viewModel.trackEvent(.contentShare, properties: [
                        "content_type": "venue",
                        "share_method": "link"
                    ])
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - iOS Features Section

struct IOSFeaturesSection: View {
    @ObservedObject var viewModel: ContentViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "iphone")
                    .foregroundColor(.black)
                Text("iOS-Specific Features")
                    .font(.headline)
                Spacer()
            }
            
            VStack(spacing: 8) {
                Button("Track View Controller") {
                    Task {
                        await viewModel.trackViewController()
                    }
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.bordered)
                
                Button("Track Deep Link") {
                    Task {
                        await viewModel.trackDeepLink()
                    }
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.bordered)
                
                Button("Track Push Notification") {
                    Task {
                        await viewModel.trackPushNotification()
                    }
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Helper Components

struct StatusCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            
            Text(value)
                .font(.title3)
                .fontWeight(.semibold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(8)
    }
}

struct EventButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () async -> Void
    
    var body: some View {
        Button {
            Task {
                await action()
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title2)
                
                Text(title)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(color)
            .cornerRadius(8)
        }
    }
}

// MARK: - View Model

@MainActor
class ContentViewModel: ObservableObject {
    @Published var isInitialized = false
    @Published var sdkStatus = "Initializing..."
    @Published var hasConsent = false
    @Published var eventsTracked = 0
    @Published var sessionTime = "0s"
    @Published var pendingEvents = 0
    @Published var anonymousId = "Loading..."
    
    private var sessionStartTime = Date()
    private var timer: Timer?
    
    init() {
        startTimer()
    }
    
    func initializeSDK() async {
        do {
            let configuration = AnonSDKConfiguration(
                apiKey: "demo-api-key-ios-12345",
                environment: .development,
                debugMode: true,
                onConsent: { [weak self] in
                    return self?.hasConsent ?? false
                }
            )
            
            try await AnonSDK.shared.initialize(configuration: configuration)
            
            isInitialized = true
            sdkStatus = "Ready ✅"
            hasConsent = AnonSDK.shared.hasUserConsent()
            
            updateMetrics()
            
        } catch {
            sdkStatus = "Error: \(error.localizedDescription)"
        }
    }
    
    func setConsent(_ consent: Bool) async {
        await AnonSDK.shared.setConsent(consent)
        hasConsent = AnonSDK.shared.hasUserConsent()
    }
    
    func trackEvent(
        _ eventType: IntentEventType,
        properties: [String: Any] = [:]
    ) async {
        guard let eventId = await AnonSDK.shared.trackEvent(eventType, properties: properties) else {
            return
        }
        
        eventsTracked += 1
        updateMetrics()
        
        print("Tracked event: \(eventType.rawValue) with ID: \(eventId)")
    }
    
    func trackViewController() async {
        // Simulate tracking a view controller
        let mockViewController = UIViewController()
        mockViewController.title = "Demo View Controller"
        
        await AnonSDK.shared.trackViewController(
            mockViewController,
            properties: ["source": "demo_button"]
        )
        
        eventsTracked += 1
        updateMetrics()
    }
    
    func trackDeepLink() async {
        let mockURL = URL(string: "oncab://venue/123?source=notification")!
        
        await AnonSDK.shared.trackDeepLink(
            mockURL,
            properties: ["source": "demo_button"]
        )
        
        eventsTracked += 1
        updateMetrics()
    }
    
    func trackPushNotification() async {
        let mockUserInfo: [AnyHashable: Any] = [
            "aps": [
                "alert": "New event near you!",
                "sound": "default"
            ],
            "venue_id": "venue_123",
            "event_id": "event_456"
        ]
        
        await AnonSDK.shared.trackPushNotification(
            mockUserInfo,
            action: "opened",
            properties: ["source": "demo_button"]
        )
        
        eventsTracked += 1
        updateMetrics()
    }
    
    func flushEvents() async {
        await AnonSDK.shared.flush()
        updateMetrics()
    }
    
    private func updateMetrics() {
        pendingEvents = AnonSDK.shared.getPendingEventsCount()
        
        if let anonId = AnonSDK.shared.getAnonId() {
            anonymousId = String(anonId.prefix(12)) + "..."
        }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            DispatchQueue.main.async {
                let elapsed = Int(Date().timeIntervalSince(self.sessionStartTime))
                self.sessionTime = "\(elapsed)s"
                self.updateMetrics()
            }
        }
    }
    
    deinit {
        timer?.invalidate()
    }
}

// MARK: - Preview

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}