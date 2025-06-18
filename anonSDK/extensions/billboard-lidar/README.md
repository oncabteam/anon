# 📡 VibeMesh LiDAR Billboard Extension

Real-time, privacy-safe environmental sensing for intelligent digital billboard optimization using LiDAR technology and edge AI processing.

## 🚀 **Quick Start**

```javascript
import VibeMeshLiDAR from '@vibemesh/billboard-lidar';

const billboard = new VibeMeshLiDAR();

// Initialize with minimal configuration
await billboard.initializeLiDAR({
  apiKey: 'your-api-key',
  billboardId: 'bb_001',
  location: { lat: 40.7580, lng: -73.9855 }
});

// System automatically starts tracking crowds and optimizing content!
```

**What you get instantly:**
- ✅ **Real-time crowd detection** - Accurate people counting and clustering
- ✅ **Engagement analysis** - Attention tracking and dwell time measurement  
- ✅ **Flow pattern analysis** - Pedestrian movement and direction tracking
- ✅ **Anomaly detection** - Crowd surges, unusual patterns, safety alerts
- ✅ **Content optimization** - Automatic content selection based on audience
- ✅ **Privacy-first design** - No facial recognition, anonymous data only

## 🏗 **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    VibeMesh LiDAR System                    │
├─────────────────────────────────────────────────────────────┤
│  📡 LiDAR Sensors         🧠 Edge AI Processing            │
│  • Intel RealSense       • Nvidia Jetson Nano/Orin       │
│  • Ouster OS1/OS0        • Raspberry Pi 5 + Coral TPU    │
│  • Hesai Pandar Series   • TensorRT/TFLite Models         │
├─────────────────────────────────────────────────────────────┤
│                    Processing Pipeline                      │
│  🔍 Detection → 🎯 Clustering → 📊 Analysis → 💡 Insights  │
│  • People Detection      • Group Formation   • Engagement  │
│  • Motion Tracking       • Crowd Density     • Anomalies   │
│  • Background Removal    • Flow Patterns     • Content Opt │
├─────────────────────────────────────────────────────────────┤
│                     Privacy & Compliance                    │
│  🔒 Anonymous UUIDs  🕒 Auto Data Expiry  🚫 No Face Recognition │
│  📋 GDPR Compliant   🎛️ Configurable Modes  📊 Aggregated Only   │
└─────────────────────────────────────────────────────────────┘
```

## 🛠 **Hardware Setup**

### **Supported LiDAR Sensors**

| Sensor | Range | FOV | Best Use Case | Price Range |
|--------|--------|-----|---------------|-------------|
| **Intel RealSense D435i** | 10m | 87°×58° | Indoor/Close Range | $200-300 |
| **Intel RealSense D455** | 20m | 87°×58° | Outdoor Billboards | $300-400 |
| **Ouster OS1-64** | 120m | 360°×33° | Large Outdoor Areas | $8,000+ |
| **Ouster OS0-32** | 50m | 360°×22° | Medium Outdoor | $4,000+ |
| **Hesai Pandar QT** | 20m | 360°×20° | Premium Automotive | $2,000+ |

### **Compute Platform Requirements**

| Platform | Performance | Memory | Power | Best For |
|----------|-------------|--------|-------|----------|
| **Nvidia Jetson Nano** | 30 FPS | 4GB | 10W | Budget Deployments |
| **Nvidia Jetson Orin** | 60 FPS | 32GB | 60W | High-Performance |
| **Nvidia Jetson Xavier** | 45 FPS | 16GB | 30W | Balanced Performance |
| **Raspberry Pi 5 + Coral** | 15 FPS | 2GB | 8W | Ultra Low-Cost |

### **Installation Guide**

```bash
# 1. Mount LiDAR sensor on billboard structure
# Recommended: 30-45° downward angle, 3-5m height

# 2. Connect to compute unit via USB-C or Ethernet

# 3. Install system dependencies
sudo apt update
sudo apt install nodejs npm python3-pip

# 4. Install LiDAR drivers (example for RealSense)
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-key F6E65AC044F831AC80A06380C8B3A55A6F3EFCDE
sudo add-apt-repository "deb https://librealsense.intel.com/Debian/apt-repo $(lsb_release -cs) main"
sudo apt install librealsense2-dkms librealsense2-utils

# 5. Install VibeMesh LiDAR Extension
npm install @vibemesh/billboard-lidar
```

## 🎯 **Configuration Options**

### **Complete Configuration**

```javascript
const config = {
  // Required
  apiKey: 'your-vibemesh-api-key',
  billboardId: 'unique-billboard-identifier',
  location: {
    lat: 40.7580,
    lng: -73.9855,
    address: 'Times Square, NYC', // Optional
    zone: 'high_traffic_commercial' // Optional
  },
  
  // LiDAR Hardware Configuration
  lidar: {
    sensorType: 'intel_realsense_d455', // See supported sensors above
    computeUnit: 'jetson_orin', // Processing hardware
    samplingRate: 10, // Hz (1-30)
    fovAngle: 45, // Degrees (10-180)
    maxRange: 25, // Meters (1-120)
    enableRGB: true, // For RealSense sensors
    enableDemographics: false, // Privacy setting
    clustersOnly: true // Only send aggregated data
  },
  
  // Privacy & Compliance
  privacyMode: 'strict', // 'strict', 'balanced', 'minimal'
  dataRetentionHours: 24, // Auto-delete after hours
  enableDemographics: false, // Age/group estimation
  
  // Performance Tuning
  batchSize: 50, // Events per API call
  flushInterval: 30000, // Milliseconds
  debugMode: false // Console logging
};

await billboard.initializeLiDAR(config);
```

### **Privacy Modes**

| Mode | Demographics | Pose Analysis | Data Retention | Use Case |
|------|--------------|---------------|----------------|----------|
| **Strict** | ❌ | ❌ | 5 minutes | High Privacy |
| **Balanced** | ✅ | ❌ | 30 minutes | Standard Commercial |
| **Minimal** | ✅ | ✅ | 1 hour | Advanced Analytics |

*Note: Facial recognition is NEVER enabled in any mode*

## 📊 **Event Types & Data Format**

### **Automatic Events**

The system automatically generates these events:

```javascript
// Billboard Impression (when content is displayed)
{
  "event_type": "billboard_impression",
  "billboard_id": "bb_001",
  "content_id": "ad_premium_001",
  "duration_ms": 15000,
  "estimated_viewers": 12,
  "context": {
    "crowd_size": 10,
    "engagement_score": 0.78,
    "flow_direction": "northbound",
    "time_of_day": "evening"
  }
}

// Context Update (every 5 seconds)
{
  "event_type": "billboard_context_update", 
  "billboard_id": "bb_001",
  "cluster_count": 8,
  "avg_density": 0.65,
  "flow_direction": "eastbound", 
  "dwell_time_avg": 45000,
  "engagement_score": 0.72,
  "anomalies": [],
  "insights": [
    {
      "type": "high_traffic",
      "message": "High crowd density - optimal for premium content",
      "recommendation": "display_premium_content"
    }
  ]
}

// Anomaly Detection
{
  "event_type": "billboard_anomaly_detected",
  "billboard_id": "bb_001", 
  "anomaly_type": "crowd_surge",
  "severity": "high",
  "details": {
    "current_value": 25,
    "expected_value": 8,
    "ratio": 3.125
  }
}
```

### **Manual Tracking Methods**

```javascript
// High-level convenience methods
await billboard.trackImpression('content_id', 15000, 12, metadata);
await billboard.trackDwellTime(45000, 8, 'evening');
await billboard.trackContentRotation('old_id', 'new_id', 'context_driven');
await billboard.trackAnomalyDetection('crowd_surge', 'high', details);

// Custom events
await billboard.track('custom_event', {
  custom_field: 'value',
  billboard_id: billboard.billboardId
});
```

## 🧠 **AI Models & Capabilities**

### **Computer Vision Pipeline**

1. **Object Detection** - YOLOv8-based person detection optimized for LiDAR point clouds
2. **Clustering** - DBSCAN algorithm for group formation analysis  
3. **Flow Analysis** - Kalman filter-based motion tracking
4. **Demographics** - Privacy-safe age group estimation (no facial features)
5. **Engagement** - Pose-based attention and dwell time analysis

### **Supported Platforms**

| Compute Unit | AI Framework | Models Loaded | Performance |
|--------------|--------------|---------------|-------------|
| Jetson Nano | TensorRT | Detection + Clustering | 30 FPS |
| Jetson Orin | TensorRT | All Models | 60 FPS |
| Jetson Xavier | TensorRT | Detection + Demographics | 45 FPS |
| RPi5 + Coral | TensorFlow Lite | Detection Only | 15 FPS |

## 💼 **Business Use Cases**

### **1. Dynamic Content Optimization**

```javascript
// Automatically switch content based on audience
const context = billboard.getCurrentContext();

if (context.clusterCount > 10 && context.engagementScore > 0.7) {
  // High engagement, large crowd - show premium content
  displayContent('premium_fashion_ad');
} else if (context.clusterCount < 3) {
  // Low crowd - show attention-grabbing content
  displayContent('interactive_animation');
}
```

### **2. Revenue Optimization**

```javascript
// Track ROI of different content types
const analytics = {
  premiumContent: {
    avgViewers: 12,
    engagementRate: 0.78,
    revenuePerImpression: 500
  },
  standardContent: {
    avgViewers: 8,
    engagementRate: 0.65, 
    revenuePerImpression: 200
  }
};
```

### **3. Safety & Crowd Management**

```javascript
// Automatic safety alerts
billboard.on('anomaly', async (anomaly) => {
  if (anomaly.type === 'crowd_surge' && anomaly.severity === 'high') {
    // Alert security team
    await sendAlert('Crowd surge detected at billboard location');
    
    // Switch to crowd dispersal content
    await displayContent('public_safety_announcement');
  }
});
```

### **4. Audience Insights**

```javascript
// Real-time analytics dashboard
const insights = billboard.getCurrentContext();

console.log(`
  Current Audience: ${insights.clusterCount} groups
  Engagement Level: ${(insights.engagementScore * 100).toFixed(1)}%
  Flow Direction: ${insights.flowDirection}
  Peak Time: ${insights.peakMetrics?.timeOfPeak}
  Revenue Opportunity: $${calculateRevenue(insights)}
`);
```

## 🔒 **Privacy & Compliance**

### **Privacy by Design**

- **No Facial Recognition** - Never implemented, hardware incapable
- **Anonymous Tracking** - No personal identifiers collected
- **Aggregated Data Only** - Individual tracking impossible  
- **Auto Data Expiry** - TTL enforcement (30 minutes to 24 hours)
- **Local Processing** - AI inference runs on edge device
- **Consent Management** - Built-in opt-out mechanisms

### **GDPR Compliance**

```javascript
// Built-in privacy controls
await billboard.setPrivacyMode('strict'); // Highest privacy
await billboard.enableDemographicInference(false); // Disable demographics
await billboard.optOut(); // Stop all tracking

// Data minimization
const gdprCompliantConfig = {
  privacyMode: 'strict',
  dataRetentionHours: 1, // Minimal retention
  enableDemographics: false,
  anonymizationLevel: 'high'
};
```

### **Regulatory Compliance**

| Regulation | Compliance Status | Implementation |
|------------|------------------|----------------|
| **GDPR** | ✅ Fully Compliant | Consent management, data minimization |
| **CCPA** | ✅ Fully Compliant | Opt-out mechanisms, no sale of data |
| **PIPEDA** | ✅ Fully Compliant | Anonymization, purpose limitation |
| **Local Privacy Laws** | ✅ Configurable | Adjustable privacy modes |

## 📈 **Performance & Scalability**

### **Processing Performance**

```javascript
// Real-time performance monitoring
const diagnostics = await billboard.runDiagnostics();

console.log(`
  Processing Performance:
  - Frame Rate: ${diagnostics.lidar_sensor.frame_rate} FPS
  - Inference Time: ${diagnostics.vision_pipeline.avg_inference_time}ms
  - Memory Usage: ${diagnostics.vision_pipeline.memory_usage}MB
  - Detection Accuracy: ${diagnostics.vision_pipeline.confidence}%
  - Uptime: ${diagnostics.system_uptime}s
`);
```

### **Network Requirements**

| Data Type | Frequency | Bandwidth | Storage |
|-----------|-----------|-----------|---------|
| Context Updates | 5 seconds | ~2 KB/update | ~35 MB/day |
| Impressions | Per content | ~1 KB/impression | ~10 MB/day |
| Diagnostics | 30 seconds | ~5 KB/update | ~15 MB/day |
| **Total** | - | **~60 KB/min** | **~60 MB/day** |

### **Scalability**

- **Single Billboard** - 1 sensor, 1 compute unit
- **Billboard Network** - Centralized management, distributed processing
- **City-wide Deployment** - Cloud aggregation, edge processing
- **Multi-tenant** - Isolated data, shared infrastructure

## 🔧 **API Reference**

### **Core Methods**

```javascript
// Initialization
await billboard.initializeLiDAR(config)

// High-level tracking
await billboard.trackImpression(contentId, duration, viewers, metadata)
await billboard.trackDwellTime(avgMs, peakConcurrency, timeOfDay)
await billboard.trackContentRotation(prevId, newId, trigger)
await billboard.trackAnomalyDetection(type, severity, details)

// Privacy controls
await billboard.setPrivacyMode('strict' | 'balanced' | 'minimal')
await billboard.enableDemographicInference(boolean)
await billboard.optOut()
await billboard.optIn()

// Real-time data
const context = billboard.getCurrentContext()
const diagnostics = await billboard.runDiagnostics()

// Cleanup
await billboard.shutdown()
```

### **Event Listeners**

```javascript
// Real-time event handling
billboard.on('contextUpdate', (context) => {
  console.log('New context:', context);
});

billboard.on('anomaly', (anomaly) => {
  console.log('Anomaly detected:', anomaly);
});

billboard.on('frameProcessed', (frame) => {
  console.log('Frame processed:', frame.processingTime);
});
```

## 📊 **Analytics & Reporting**

### **Real-time Dashboard Integration**

```javascript
// WebSocket connection for live data
const ws = new WebSocket('wss://api.vibemesh.io/billboard/realtime');

ws.on('message', (data) => {
  const update = JSON.parse(data);
  
  if (update.type === 'context_update') {
    updateDashboard({
      crowdSize: update.cluster_count,
      engagement: update.engagement_score,
      revenue: calculateRevenue(update)
    });
  }
});
```

### **Historical Analytics**

```javascript
// Fetch historical performance data
const analytics = await fetch(`https://api.vibemesh.io/billboard/${billboardId}/analytics`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

const data = await analytics.json();
console.log(`
  Last 30 Days:
  - Total Impressions: ${data.totalImpressions}
  - Average Engagement: ${data.avgEngagement}%
  - Peak Crowd: ${data.peakCrowd} people
  - Revenue Generated: $${data.totalRevenue}
  - Top Performing Content: ${data.topContent.name}
`);
```

## 🎮 **Interactive Demo**

```bash
# Run the interactive billboard demo
cd examples/billboard-lidar
node lidar-billboard-example.js

# Interactive controls:
# [s] - Show current status
# [d] - Run full diagnostics  
# [p] - Toggle privacy mode
# [c] - Show current context
# [r] - Force content rotation
# [q] - Quit demo
```

## 🚀 **Deployment Examples**

### **Times Square Billboard**

```javascript
const timesSquareBillboard = new VibeMeshLiDAR();

await timesSquareBillboard.initializeLiDAR({
  apiKey: process.env.VIBEMESH_API_KEY,
  billboardId: 'bb_times_square_001',
  location: { lat: 40.7580, lng: -73.9855 },
  lidar: {
    sensorType: 'intel_realsense_d455',
    computeUnit: 'jetson_orin',
    maxRange: 25,
    enableDemographics: true // For content optimization
  }
});
```

### **Shopping Mall Display**

```javascript
const mallDisplay = new VibeMeshLiDAR();

await mallDisplay.initializeLiDAR({
  apiKey: process.env.VIBEMESH_API_KEY,
  billboardId: 'bb_westfield_mall_001', 
  location: { lat: 37.4419, lng: -122.1430 },
  lidar: {
    sensorType: 'intel_realsense_d435i',
    computeUnit: 'jetson_nano', // Cost-effective for indoor
    maxRange: 10,
    privacyMode: 'strict' // Higher privacy for retail
  }
});
```

### **Highway Billboard**

```javascript
const highwayBillboard = new VibeMeshLiDAR();

await highwayBillboard.initializeLiDAR({
  apiKey: process.env.VIBEMESH_API_KEY,
  billboardId: 'bb_highway_101_north',
  location: { lat: 37.7749, lng: -122.4194 },
  lidar: {
    sensorType: 'ouster_os1',
    computeUnit: 'jetson_xavier',
    maxRange: 50, // Long range for highway
    samplingRate: 20 // Higher rate for fast-moving traffic
  }
});
```

## 🆘 **Troubleshooting**

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| No LiDAR data | Sensor connection | Check USB/Ethernet cables |
| Low frame rate | Insufficient compute | Upgrade to Jetson Orin |
| High memory usage | Too many models loaded | Reduce capabilities or increase RAM |
| Network errors | API key/connectivity | Verify credentials and internet |
| Inaccurate detection | Poor sensor positioning | Adjust mounting angle |

### **Debug Mode**

```javascript
// Enable detailed logging
await billboard.initializeLiDAR({
  ...config,
  debugMode: true
});

// Check system status
const status = billboard.getStatus();
console.log('System status:', status);

// Run diagnostics
const diagnostics = await billboard.runDiagnostics();
console.log('Full diagnostics:', diagnostics);
```

## 📞 **Support & Resources**

- **Documentation**: [docs.vibemesh.io/billboard-lidar](https://docs.vibemesh.io/billboard-lidar)
- **API Reference**: [api.vibemesh.io/billboard](https://api.vibemesh.io/billboard)
- **Hardware Guide**: [hardware.vibemesh.io](https://hardware.vibemesh.io)
- **Support**: [support@vibemesh.io](mailto:support@vibemesh.io)
- **Community**: [github.com/vibemesh/billboard-lidar](https://github.com/vibemesh/billboard-lidar)

## 📄 **License**

MIT License - Commercial use encouraged. See [LICENSE](../../LICENSE) for details.

---

**VibeMesh LiDAR Billboard Extension** - Transform any digital billboard into an intelligent, audience-aware advertising platform with privacy-first crowd analytics. 🚀