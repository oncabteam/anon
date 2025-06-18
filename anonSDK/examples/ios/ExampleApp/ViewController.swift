import UIKit

class ViewController: UIViewController {
    
    @IBOutlet weak var statusLabel: UILabel!
    @IBOutlet weak var userIdLabel: UILabel!
    @IBOutlet weak var sessionIdLabel: UILabel!
    @IBOutlet weak var pendingEventsLabel: UILabel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "VibeMesh iOS Example"
        
        setupVibeMesh()
        updateUI()
        
        // Update UI periodically
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            self.updateUI()
        }
    }
    
    private func setupVibeMesh() {
        Task {
            do {
                let config = VibeMesh.Configuration(
                    apiKey: "your-api-key-here",
                    enableGeolocation: true,
                    enableAutoTracking: true,
                    debugMode: true
                )
                
                try await VibeMesh.shared.initialize(config: config)
                
                DispatchQueue.main.async {
                    self.statusLabel.text = "✅ Initialized"
                    self.statusLabel.textColor = .systemGreen
                }
            } catch {
                print("Failed to initialize VibeMesh: \(error)")
                DispatchQueue.main.async {
                    self.statusLabel.text = "❌ Failed to Initialize"
                    self.statusLabel.textColor = .systemRed
                }
            }
        }
    }
    
    private func updateUI() {
        userIdLabel.text = "User ID: \(VibeMesh.shared.getUserId() ?? "Loading...")"
        sessionIdLabel.text = "Session ID: \(VibeMesh.shared.getSessionId() ?? "Loading...")"
        pendingEventsLabel.text = "Pending Events: \(VibeMesh.shared.getPendingEventsCount())"
    }
    
    // MARK: - Actions
    
    @IBAction func trackScreenViewTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.trackScreenView("ExampleScreen", screenClass: "ViewController")
            showAlert(title: "Success", message: "Screen view tracked!")
        }
    }
    
    @IBAction func trackButtonTapTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.trackButtonTap("Example Button")
            showAlert(title: "Success", message: "Button tap tracked!")
        }
    }
    
    @IBAction func trackSearchTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.trackSearch(
                query: "jazz clubs",
                resultCount: 5,
                filters: ["location": "San Francisco", "category": "music"]
            )
            showAlert(title: "Success", message: "Search tracked!")
        }
    }
    
    @IBAction func trackPurchaseTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.trackPurchase(
                transactionId: "txn_\(UUID().uuidString)",
                amount: 29.99,
                currency: "USD",
                items: [
                    ["name": "Concert Ticket", "price": "29.99", "quantity": "1"]
                ]
            )
            showAlert(title: "Success", message: "Purchase tracked!")
        }
    }
    
    @IBAction func trackContentViewTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.trackContentView(
                contentId: "content_123",
                contentType: "article",
                contentName: "How to Use VibeMesh"
            )
            showAlert(title: "Success", message: "Content view tracked!")
        }
    }
    
    @IBAction func flushEventsTapped(_ sender: UIButton) {
        VibeMesh.shared.flush()
        showAlert(title: "Success", message: "Events flushed to server!")
    }
    
    @IBAction func toggleOptOutTapped(_ sender: UIButton) {
        Task {
            if VibeMesh.shared.isOptedOutStatus() {
                await VibeMesh.shared.optIn()
                showAlert(title: "Success", message: "Opted back into tracking")
            } else {
                await VibeMesh.shared.optOut()
                showAlert(title: "Success", message: "Opted out of tracking")
            }
        }
    }
    
    // MARK: - Custom Event Examples
    
    @IBAction func trackVenueViewTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.track(
                eventType: "view_venue",
                context: [
                    "venue_id": "venue_123",
                    "venue_name": "Blue Note Jazz Club",
                    "category": "music_venue",
                    "tags": "jazz,live_music,cocktails"
                ]
            )
            showAlert(title: "Success", message: "Venue view tracked!")
        }
    }
    
    @IBAction func trackEventViewTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.track(
                eventType: "view_event",
                context: [
                    "event_id": "event_456",
                    "event_name": "Jazz Night",
                    "venue_id": "venue_123",
                    "date": "2024-12-01T20:00:00Z",
                    "tags": "jazz,live"
                ]
            )
            showAlert(title: "Success", message: "Event view tracked!")
        }
    }
    
    @IBAction func trackMapInteractionTapped(_ sender: UIButton) {
        Task {
            await VibeMesh.shared.track(
                eventType: "map_interaction",
                context: [
                    "interaction_type": "zoom",
                    "zoom_level": "14",
                    "center_lat": "37.7749",
                    "center_lng": "-122.4194"
                ]
            )
            showAlert(title: "Success", message: "Map interaction tracked!")
        }
    }
    
    // MARK: - Privacy Controls
    
    @IBAction func showPrivacyControlsTapped(_ sender: UIButton) {
        let alert = UIAlertController(
            title: "Privacy Controls",
            message: "VibeMesh respects your privacy. You can opt-out of tracking at any time.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "View Privacy Policy", style: .default) { _ in
            // Open privacy policy URL
            if let url = URL(string: "https://vibemesh.io/privacy") {
                UIApplication.shared.open(url)
            }
        })
        
        alert.addAction(UIAlertAction(title: "Opt Out", style: .destructive) { _ in
            Task {
                await VibeMesh.shared.optOut()
                DispatchQueue.main.async {
                    self.showAlert(title: "Privacy", message: "You have opted out of tracking")
                }
            }
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        present(alert, animated: true)
    }
    
    // MARK: - Helper Methods
    
    private func showAlert(title: String, message: String) {
        DispatchQueue.main.async {
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(alert, animated: true)
        }
    }
}

// MARK: - Example of Custom Screen Tracking

class ProductViewController: UIViewController {
    var productId: String?
    var productName: String?
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Custom tracking for product views
        Task {
            await VibeMesh.shared.track(
                eventType: "view_product",
                context: [
                    "product_id": productId ?? "",
                    "product_name": productName ?? "",
                    "screen_name": "ProductViewController"
                ]
            )
        }
    }
}

// MARK: - Example of Custom Button Tracking

class CustomButton: UIButton {
    var trackingData: [String: String] = [:]
    
    override func sendAction(_ action: Selector, to target: Any?, for event: UIEvent?) {
        super.sendAction(action, to: target, for: event)
        
        // Custom tracking for special buttons
        if !trackingData.isEmpty {
            Task {
                await VibeMesh.shared.track(
                    eventType: "custom_button_tap",
                    context: trackingData
                )
            }
        }
    }
}