#!/usr/bin/env node

/**
 * VibeMesh LiDAR Billboard Example
 * Demonstrates real-time crowd analysis for digital billboard optimization
 */

import VibeMeshLiDAR from '../../extensions/billboard-lidar/VibeMeshLiDAR.js';

class BillboardLiDARDemo {
  constructor() {
    this.vibeMesh = new VibeMeshLiDAR();
    this.isRunning = false;
    this.currentContent = null;
    this.contentSchedule = [];
    this.performanceMetrics = {
      startTime: Date.now(),
      totalImpressions: 0,
      peakCrowdSize: 0,
      averageEngagement: 0,
      contentRotations: 0
    };
  }

  /**
   * Initialize the billboard LiDAR system
   */
  async initialize() {
    try {
      console.log('🚀 Starting VibeMesh LiDAR Billboard Demo...\n');

      // Configuration for Times Square Billboard
      const config = {
        apiKey: process.env.VIBEMESH_API_KEY || 'demo-billboard-key-123',
        billboardId: 'bb_times_square_north_001',
        location: {
          lat: 40.7580,
          lng: -73.9855,
          address: 'Times Square North, NYC',
          zone: 'high_traffic_commercial'
        },
        endpoint: 'https://api.vibemesh.io/events',
        
        // LiDAR sensor configuration
        lidar: {
          sensorType: 'intel_realsense_d455', // Higher range for billboard
          computeUnit: 'jetson_orin', // High-performance processing
          samplingRate: 10, // 10 Hz
          fovAngle: 45, // Wide field of view
          maxRange: 25, // 25 meter range
          enableRGB: true,
          enableDemographics: true, // Enable for content optimization
          clustersOnly: true
        },
        
        // SDK configuration
        sdk: {
          batchSize: 25,
          flushInterval: 10000, // 10 seconds for real-time updates
          debugMode: true
        }
      };

      // Initialize LiDAR system
      await this.vibeMesh.initializeLiDAR(config);

      // Setup content management
      this.setupContentSchedule();
      this.setupRealTimeAdaptation();
      this.setupPerformanceMonitoring();

      // Start monitoring
      this.startDemo();

      console.log('✅ LiDAR Billboard System Initialized Successfully!\n');
      console.log(`📍 Location: ${config.location.address}`);
      console.log(`📡 Sensor: ${config.lidar.sensorType} on ${config.lidar.computeUnit}`);
      console.log(`🎯 Max Range: ${config.lidar.maxRange}m, FOV: ${config.lidar.fovAngle}°\n`);

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup content schedule with different types
   */
  setupContentSchedule() {
    this.contentSchedule = [
      {
        id: 'premium_fashion',
        name: 'Luxury Fashion Ad',
        duration: 15000, // 15 seconds
        targetAudience: { minCrowd: 8, minEngagement: 0.6 },
        priority: 'high',
        revenue: 500 // $ per impression
      },
      {
        id: 'tech_startup',
        name: 'Tech Startup Promo',
        duration: 12000,
        targetAudience: { minCrowd: 5, demographics: ['18-35'] },
        priority: 'medium',
        revenue: 200
      },
      {
        id: 'local_restaurant',
        name: 'Local Restaurant',
        duration: 10000,
        targetAudience: { minCrowd: 3, timeOfDay: ['morning', 'afternoon'] },
        priority: 'medium',
        revenue: 100
      },
      {
        id: 'public_service',
        name: 'Public Service Announcement',
        duration: 8000,
        targetAudience: { minCrowd: 1 },
        priority: 'low',
        revenue: 0
      },
      {
        id: 'attention_grabber',
        name: 'Interactive Animation',
        duration: 20000,
        targetAudience: { maxCrowd: 3, lowEngagement: true },
        priority: 'medium',
        revenue: 50
      }
    ];

    console.log('📺 Content Schedule Loaded:');
    this.contentSchedule.forEach(content => {
      console.log(`   • ${content.name} (${content.duration/1000}s, $${content.revenue})`);
    });
    console.log('');
  }

  /**
   * Setup real-time content adaptation based on LiDAR data
   */
  setupRealTimeAdaptation() {
    // Monitor context changes every 5 seconds
    setInterval(async () => {
      const context = this.vibeMesh.getCurrentContext();
      if (context) {
        await this.adaptContent(context);
      }
    }, 5000);
  }

  /**
   * Adapt content based on real-time context
   */
  async adaptContent(context) {
    try {
      const optimalContent = this.selectOptimalContent(context);
      
      if (optimalContent && (!this.currentContent || optimalContent.id !== this.currentContent.id)) {
        // Log context-driven content change
        console.log(`🎯 Context Update: ${context.clusterCount} people, ${(context.engagementScore * 100).toFixed(1)}% engagement`);
        console.log(`🔄 Switching to: ${optimalContent.name}`);
        
        // Track content rotation
        await this.vibeMesh.trackContentRotation(
          this.currentContent?.id || null,
          optimalContent.id,
          'context_driven'
        );
        
        this.currentContent = optimalContent;
        this.performanceMetrics.contentRotations++;
        
        // Display content (mock)
        await this.displayContent(optimalContent, context);
      }
    } catch (error) {
      console.error('Content adaptation error:', error.message);
    }
  }

  /**
   * Select optimal content based on context
   */
  selectOptimalContent(context) {
    const currentHour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay(currentHour);
    
    // Score each content option
    const scoredContent = this.contentSchedule.map(content => {
      let score = content.priority === 'high' ? 100 : 
                  content.priority === 'medium' ? 50 : 25;
      
      // Crowd size matching
      if (content.targetAudience.minCrowd && context.clusterCount >= content.targetAudience.minCrowd) {
        score += 30;
      }
      if (content.targetAudience.maxCrowd && context.clusterCount <= content.targetAudience.maxCrowd) {
        score += 20;
      }
      
      // Engagement requirements
      if (content.targetAudience.minEngagement && context.engagementScore >= content.targetAudience.minEngagement) {
        score += 25;
      }
      if (content.targetAudience.lowEngagement && context.engagementScore < 0.4) {
        score += 30; // Boost attention-grabbing content for low engagement
      }
      
      // Time of day matching
      if (content.targetAudience.timeOfDay && content.targetAudience.timeOfDay.includes(timeOfDay)) {
        score += 15;
      }
      
      // Revenue weighting
      score += Math.log(content.revenue + 1) * 5;
      
      return { ...content, score };
    });
    
    // Return highest scoring content
    return scoredContent.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  /**
   * Display content and track impression
   */
  async displayContent(content, context) {
    const impressionStart = Date.now();
    const estimatedViewers = Math.max(1, Math.round(context.clusterCount * 1.2)); // Account for individuals vs groups
    
    console.log(`🎬 Now Playing: ${content.name}`);
    console.log(`   👥 Estimated Viewers: ${estimatedViewers}`);
    console.log(`   📊 Engagement Score: ${(context.engagementScore * 100).toFixed(1)}%`);
    console.log(`   💰 Revenue Impact: $${content.revenue}\n`);
    
    // Track impression
    await this.vibeMesh.trackImpression(
      content.id,
      content.duration,
      estimatedViewers,
      {
        content_name: content.name,
        priority: content.priority,
        revenue_value: content.revenue,
        crowd_size: context.clusterCount,
        engagement_score: context.engagementScore,
        flow_direction: context.flowDirection,
        time_of_day: this.getTimeOfDay(new Date().getHours())
      }
    );
    
    // Update performance metrics
    this.performanceMetrics.totalImpressions++;
    this.performanceMetrics.peakCrowdSize = Math.max(this.performanceMetrics.peakCrowdSize, context.clusterCount);
    this.performanceMetrics.averageEngagement = 
      (this.performanceMetrics.averageEngagement + context.engagementScore) / 2;
    
    // Simulate content duration
    setTimeout(async () => {
      console.log(`✅ Content Complete: ${content.name} (${estimatedViewers} viewers)\n`);
    }, Math.min(content.duration, 5000)); // Cap at 5s for demo
  }

  /**
   * Setup performance monitoring and reporting
   */
  setupPerformanceMonitoring() {
    // System diagnostics every 30 seconds
    setInterval(async () => {
      try {
        const diagnostics = await this.vibeMesh.runDiagnostics();
        this.logSystemHealth(diagnostics);
      } catch (error) {
        console.error('Diagnostics error:', error.message);
      }
    }, 30000);
    
    // Performance summary every 2 minutes
    setInterval(() => {
      this.logPerformanceSummary();
    }, 120000);
    
    // Anomaly monitoring
    setInterval(() => {
      this.checkForAnomalies();
    }, 10000);
  }

  /**
   * Log system health information
   */
  logSystemHealth(diagnostics) {
    console.log('🔧 System Health Check:');
    console.log(`   📡 LiDAR: ${diagnostics.lidar_sensor?.hardware_status || 'unknown'}`);
    console.log(`   🧠 Vision: ${diagnostics.vision_pipeline?.pipeline_status || 'unknown'}`);
    console.log(`   📊 Context: ${diagnostics.context_analyzer?.analyzer_status || 'unknown'}`);
    console.log(`   📈 Frame Rate: ${diagnostics.lidar_sensor?.frame_rate?.toFixed(1) || 0} FPS`);
    console.log(`   💾 Memory: ${diagnostics.vision_pipeline?.memory_status?.utilization_percent?.toFixed(1) || 0}%\n`);
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary() {
    const uptime = Math.round((Date.now() - this.performanceMetrics.startTime) / 1000);
    const uptimeStr = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
    
    console.log('📊 Performance Summary:');
    console.log(`   ⏱️  Uptime: ${uptimeStr}`);
    console.log(`   🎬 Total Impressions: ${this.performanceMetrics.totalImpressions}`);
    console.log(`   👥 Peak Crowd: ${this.performanceMetrics.peakCrowdSize} people`);
    console.log(`   📈 Avg Engagement: ${(this.performanceMetrics.averageEngagement * 100).toFixed(1)}%`);
    console.log(`   🔄 Content Rotations: ${this.performanceMetrics.contentRotations}`);
    
    const totalRevenue = this.performanceMetrics.totalImpressions * 150; // Avg revenue estimate
    console.log(`   💰 Est. Revenue: $${totalRevenue}\n`);
  }

  /**
   * Check for anomalies and handle them
   */
  checkForAnomalies() {
    const context = this.vibeMesh.getCurrentContext();
    if (context && context.anomalies && context.anomalies.length > 0) {
      context.anomalies.forEach(async anomaly => {
        console.log(`🚨 Anomaly Detected: ${anomaly.type} (${anomaly.severity})`);
        
        // Track anomaly
        await this.vibeMesh.trackAnomalyDetection(
          anomaly.type,
          anomaly.severity,
          anomaly
        );
        
        // Handle specific anomalies
        switch (anomaly.type) {
          case 'crowd_surge':
            console.log('   📈 Crowd surge detected - switching to high-capacity content');
            break;
          case 'unusual_dwell':
            console.log('   ⏱️  Unusual dwell time - extending current content');
            break;
          case 'flow_change':
            console.log('   🔄 Flow pattern changed - monitoring situation');
            break;
        }
        console.log('');
      });
    }
  }

  /**
   * Get time of day category
   */
  getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Start the demo with interactive controls
   */
  startDemo() {
    this.isRunning = true;
    
    console.log('🎮 Interactive Controls:');
    console.log('   [s] - Show current status');
    console.log('   [d] - Run full diagnostics');
    console.log('   [p] - Toggle privacy mode');
    console.log('   [c] - Show current context');
    console.log('   [r] - Force content rotation');
    console.log('   [q] - Quit demo\n');
    
    // Setup keyboard input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (key) => {
      switch (key.toLowerCase()) {
        case 's':
          this.showStatus();
          break;
        case 'd':
          await this.runFullDiagnostics();
          break;
        case 'p':
          await this.togglePrivacyMode();
          break;
        case 'c':
          this.showCurrentContext();
          break;
        case 'r':
          await this.forceContentRotation();
          break;
        case 'q':
        case '\u0003': // Ctrl+C
          await this.shutdown();
          break;
      }
    });
  }

  /**
   * Show current status
   */
  showStatus() {
    const context = this.vibeMesh.getCurrentContext();
    console.log('\n📊 Current Status:');
    if (context) {
      console.log(`   👥 Crowd: ${context.clusterCount} clusters`);
      console.log(`   📈 Engagement: ${(context.engagementScore * 100).toFixed(1)}%`);
      console.log(`   🧭 Flow: ${context.flowDirection}`);
      console.log(`   🎬 Content: ${this.currentContent?.name || 'None'}`);
    } else {
      console.log('   ⏳ Waiting for LiDAR data...');
    }
    console.log('');
  }

  /**
   * Run full system diagnostics
   */
  async runFullDiagnostics() {
    console.log('\n🔧 Running Full Diagnostics...');
    try {
      const diagnostics = await this.vibeMesh.runDiagnostics();
      console.log(JSON.stringify(diagnostics, null, 2));
    } catch (error) {
      console.error('Diagnostics failed:', error.message);
    }
    console.log('');
  }

  /**
   * Toggle privacy mode
   */
  async togglePrivacyMode() {
    const modes = ['strict', 'balanced', 'minimal'];
    const currentMode = this.vibeMesh.privacyMode || 'strict';
    const currentIndex = modes.indexOf(currentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    try {
      await this.vibeMesh.setPrivacyMode(nextMode);
      console.log(`\n🔒 Privacy mode changed: ${currentMode} → ${nextMode}\n`);
    } catch (error) {
      console.error('Privacy mode change failed:', error.message);
    }
  }

  /**
   * Show current context details
   */
  showCurrentContext() {
    const context = this.vibeMesh.getCurrentContext();
    console.log('\n📊 Detailed Context:');
    if (context) {
      console.log(JSON.stringify(context, null, 2));
    } else {
      console.log('   No context data available');
    }
    console.log('');
  }

  /**
   * Force content rotation
   */
  async forceContentRotation() {
    console.log('\n🔄 Forcing content rotation...');
    const context = this.vibeMesh.getCurrentContext() || { clusterCount: 1, engagementScore: 0.5 };
    await this.adaptContent(context);
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown() {
    console.log('\n🛑 Shutting down LiDAR Billboard System...');
    
    this.isRunning = false;
    
    try {
      // Final performance report
      this.logPerformanceSummary();
      
      // Shutdown VibeMesh LiDAR
      await this.vibeMesh.shutdown();
      
      console.log('✅ Shutdown complete. Goodbye!');
      process.exit(0);
      
    } catch (error) {
      console.error('Shutdown error:', error.message);
      process.exit(1);
    }
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new BillboardLiDARDemo();
  
  // Handle process termination
  process.on('SIGINT', async () => {
    await demo.shutdown();
  });
  
  process.on('SIGTERM', async () => {
    await demo.shutdown();
  });
  
  // Start the demo
  demo.initialize().catch(error => {
    console.error('Demo failed to start:', error);
    process.exit(1);
  });
}

export default BillboardLiDARDemo;