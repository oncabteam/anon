/**
 * VibeMesh SDK Node.js Example for Digital Billboards
 * Demonstrates how to integrate VibeMesh into a digital billboard/DOOH system
 */

const { VibeMeshNode, EVENT_TYPES } = require('../../platforms/node/VibeMeshNode');
const readline = require('readline');

// Create VibeMesh instance
const vibeMesh = new VibeMeshNode();

// Configuration for this billboard
const CONFIG = {
  clientId: 'your-billboard-client-id',
  endpoint: 'https://api.vibemesh.io/events',
  deviceId: 'billboard-001',
  locationId: 'times-square-north',
  staticLocation: {
    lat: 40.7580,
    lng: -73.9855
  },
  storageDir: './billboard_data',
  debugMode: true,
};

// Sample content library
const CONTENT_LIBRARY = [
  {
    id: 'content_001',
    name: 'Jazz Festival Promo',
    type: 'video',
    duration: 30000, // 30 seconds
    tags: ['music', 'jazz', 'festival'],
  },
  {
    id: 'content_002',
    name: 'Restaurant Special',
    type: 'image',
    duration: 15000, // 15 seconds
    tags: ['food', 'dining', 'special'],
  },
  {
    id: 'content_003',
    name: 'Art Gallery Opening',
    type: 'video',
    duration: 25000, // 25 seconds
    tags: ['art', 'gallery', 'opening'],
  },
];

// Billboard state
let currentContent = null;
let contentStartTime = null;
let viewerEstimateInterval = null;

/**
 * Initialize the VibeMesh SDK
 */
async function initializeBillboard() {
  try {
    console.log('🚀 Initializing VibeMesh Billboard SDK...');
    
    await vibeMesh.init(CONFIG);
    
    console.log('✅ VibeMesh SDK initialized successfully');
    console.log(`📍 Device ID: ${CONFIG.deviceId}`);
    console.log(`📍 Location ID: ${CONFIG.locationId}`);
    console.log(`👤 User ID: ${vibeMesh.getUserId()}`);
    console.log(`🔄 Session ID: ${vibeMesh.getSessionId()}`);
    
    // Start the billboard simulation
    startBillboardSimulation();
    
  } catch (error) {
    console.error('❌ Failed to initialize VibeMesh SDK:', error);
    process.exit(1);
  }
}

/**
 * Start the billboard content rotation simulation
 */
function startBillboardSimulation() {
  console.log('\n🎬 Starting billboard content rotation...');
  console.log('Press Ctrl+C to stop\n');
  
  // Rotate content every 30-60 seconds
  setInterval(() => {
    rotateContent();
  }, getRandomInterval(30000, 60000));
  
  // Start with first content
  rotateContent();
  
  // Simulate viewer count changes
  startViewerSimulation();
}

/**
 * Rotate to next content
 */
async function rotateContent() {
  try {
    // End current content if any
    if (currentContent && contentStartTime) {
      const actualDuration = Date.now() - contentStartTime;
      await vibeMesh.trackContentEnd(currentContent, actualDuration);
      console.log(`📺 Content ended: ${currentContent.name} (${actualDuration}ms)`);
    }
    
    // Select random content
    const content = CONTENT_LIBRARY[Math.floor(Math.random() * CONTENT_LIBRARY.length)];
    currentContent = content;
    contentStartTime = Date.now();
    
    // Track content start
    await vibeMesh.trackContentStart(content);
    console.log(`▶️  Content started: ${content.name} (${content.duration}ms planned)`);
    
    // Track impression with estimated viewers
    const estimatedViewers = getRandomViewers();
    await vibeMesh.trackImpression(content, estimatedViewers);
    console.log(`👥 Impression tracked: ${estimatedViewers} estimated viewers`);
    
  } catch (error) {
    console.error('❌ Error rotating content:', error);
  }
}

/**
 * Simulate viewer count and dwell time tracking
 */
function startViewerSimulation() {
  viewerEstimateInterval = setInterval(async () => {
    try {
      const viewers = getRandomViewers();
      const dwellTime = getRandomInterval(5000, 30000); // 5-30 seconds
      
      await vibeMesh.trackDwellTime(dwellTime, viewers);
      console.log(`⏱️  Dwell time tracked: ${dwellTime}ms, ${viewers} viewers`);
      
    } catch (error) {
      console.error('❌ Error tracking dwell time:', error);
    }
  }, getRandomInterval(10000, 20000)); // Every 10-20 seconds
}

/**
 * Simulate various interactions
 */
async function simulateInteraction(type, details = {}) {
  try {
    await vibeMesh.trackInteraction(type, details);
    console.log(`🤝 Interaction tracked: ${type}`, details);
  } catch (error) {
    console.error('❌ Error tracking interaction:', error);
  }
}

/**
 * Track system events
 */
async function trackSystemEvent(eventType, details = {}) {
  try {
    await vibeMesh.trackSystemEvent(eventType, details);
    console.log(`⚙️  System event tracked: ${eventType}`, details);
  } catch (error) {
    console.error('❌ Error tracking system event:', error);
  }
}

/**
 * Get random number of viewers (simulated)
 */
function getRandomViewers() {
  // Simulate time-of-day variation
  const hour = new Date().getHours();
  const baseViewers = hour >= 8 && hour <= 20 ? 
    Math.floor(Math.random() * 15) + 5 : // 5-20 viewers during day
    Math.floor(Math.random() * 5) + 1;  // 1-5 viewers at night
  
  return baseViewers;
}

/**
 * Get random interval between min and max
 */
function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown() {
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down billboard...');
    
    try {
      // End current content
      if (currentContent && contentStartTime) {
        const actualDuration = Date.now() - contentStartTime;
        await vibeMesh.trackContentEnd(currentContent, actualDuration);
      }
      
      // Track system shutdown
      await trackSystemEvent('shutdown', {
        reason: 'manual',
        uptime: process.uptime(),
      });
      
      // Clear intervals
      if (viewerEstimateInterval) {
        clearInterval(viewerEstimateInterval);
      }
      
      // Cleanup VibeMesh
      vibeMesh.cleanup();
      
      console.log('✅ Billboard shutdown complete');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
}

/**
 * Interactive command interface
 */
function setupInteractiveCommands() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n📝 Available commands:');
  console.log('  qr     - Simulate QR code scan');
  console.log('  nfc    - Simulate NFC tap');
  console.log('  error  - Simulate system error');
  console.log('  flush  - Force flush events');
  console.log('  status - Show current status');
  console.log('  help   - Show this help');
  console.log('  quit   - Exit program\n');
  
  rl.on('line', async (input) => {
    const command = input.trim().toLowerCase();
    
    switch (command) {
      case 'qr':
        await simulateInteraction('qr_scan', {
          qr_content: 'https://example.com/jazz-festival',
          scan_time: new Date().toISOString(),
        });
        break;
        
      case 'nfc':
        await simulateInteraction('nfc_tap', {
          nfc_id: 'tag_001',
          tap_time: new Date().toISOString(),
        });
        break;
        
      case 'error':
        await trackSystemEvent('error', {
          error_type: 'display_malfunction',
          error_message: 'Screen flickering detected',
          severity: 'warning',
        });
        break;
        
      case 'flush':
        try {
          await vibeMesh.flush();
          console.log(`📤 Flushed events to server (${vibeMesh.getPendingEventsCount()} pending)`);
        } catch (error) {
          console.error('❌ Error flushing events:', error);
        }
        break;
        
      case 'status':
        console.log('\n📊 Billboard Status:');
        console.log(`  Device ID: ${CONFIG.deviceId}`);
        console.log(`  Location: ${CONFIG.locationId}`);
        console.log(`  Current Content: ${currentContent?.name || 'None'}`);
        console.log(`  Pending Events: ${vibeMesh.getPendingEventsCount()}`);
        console.log(`  Session ID: ${vibeMesh.getSessionId()}`);
        console.log('');
        break;
        
      case 'help':
        console.log('\n📝 Available commands:');
        console.log('  qr     - Simulate QR code scan');
        console.log('  nfc    - Simulate NFC tap');
        console.log('  error  - Simulate system error');
        console.log('  flush  - Force flush events');
        console.log('  status - Show current status');
        console.log('  help   - Show this help');
        console.log('  quit   - Exit program\n');
        break;
        
      case 'quit':
      case 'exit':
        process.emit('SIGINT');
        break;
        
      default:
        if (command) {
          console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
        }
        break;
    }
  });
}

/**
 * Periodic status reporting
 */
function startStatusReporting() {
  setInterval(() => {
    const pending = vibeMesh.getPendingEventsCount();
    if (pending > 0) {
      console.log(`📊 Status: ${pending} events pending sync`);
    }
  }, 60000); // Every minute
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 VibeMesh Billboard Example Starting...\n');
  
  // Set up graceful shutdown
  setupGracefulShutdown();
  
  try {
    // Initialize the billboard
    await initializeBillboard();
    
    // Track startup
    await trackSystemEvent('startup', {
      device_id: CONFIG.deviceId,
      location_id: CONFIG.locationId,
      version: '1.0.0',
    });
    
    // Setup interactive commands
    setupInteractiveCommands();
    
    // Start status reporting
    startStatusReporting();
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Start the billboard
main();