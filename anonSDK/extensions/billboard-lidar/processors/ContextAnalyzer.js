/**
 * Context Analyzer for Billboard LiDAR Data
 * Aggregates vision pipeline results into actionable billboard insights
 * @version 1.0.0
 */

/**
 * Time-of-day patterns for context analysis
 */
const TIME_PATTERNS = {
  morning: { start: 6, end: 12, expectedCrowd: 'commuters', density: 0.6 },
  afternoon: { start: 12, end: 17, expectedCrowd: 'mixed', density: 0.8 },
  evening: { start: 17, end: 21, expectedCrowd: 'leisure', density: 0.9 },
  night: { start: 21, end: 6, expectedCrowd: 'entertainment', density: 0.4 }
};

/**
 * Weather impact factors on crowd behavior
 */
const WEATHER_FACTORS = {
  sunny: { crowdMultiplier: 1.2, dwellMultiplier: 1.1, engagementBonus: 0.1 },
  cloudy: { crowdMultiplier: 1.0, dwellMultiplier: 1.0, engagementBonus: 0.0 },
  rainy: { crowdMultiplier: 0.6, dwellMultiplier: 0.8, engagementBonus: -0.2 },
  snowy: { crowdMultiplier: 0.4, dwellMultiplier: 0.7, engagementBonus: -0.1 }
};

/**
 * Context analyzer for processing and aggregating LiDAR insights
 */
export class ContextAnalyzer {
  constructor(config) {
    this.config = config;
    this.billboardId = config.billboardId;
    this.location = config.location;
    this.retentionHours = config.retentionHours || 24;
    
    // Historical data storage
    this.historicalData = new Map();
    this.recentFrames = [];
    this.maxRecentFrames = 100; // Keep last 100 frames for trend analysis
    
    // Aggregation windows
    this.aggregationWindows = {
      immediate: [], // Last 30 seconds
      short: [], // Last 5 minutes
      medium: [], // Last 30 minutes
      long: [] // Last 2 hours
    };
    
    // Context state
    this.currentContext = null;
    this.trendAnalysis = null;
    this.anomalyDetector = null;
    
    // Performance metrics
    this.metrics = {
      framesAnalyzed: 0,
      averageProcessingTime: 0,
      totalPeopleDetected: 0,
      peakCrowdSize: 0,
      lastUpdate: null
    };
    
    // Initialize components
    this.initializeAnomalyDetector();
    this.startAggregationTimers();
  }

  /**
   * Initialize anomaly detection system
   */
  initializeAnomalyDetector() {
    this.anomalyDetector = {
      baselineMetrics: {
        averageCrowd: 0,
        peakCrowd: 0,
        averageDwellTime: 0,
        typicalFlowPattern: null
      },
      
      thresholds: {
        crowdSurge: 3.0, // 3x normal crowd size
        unusualDwell: 2.5, // 2.5x normal dwell time
        flowReversal: 0.8, // 80% flow direction change
        rapidChange: 5.0 // 5x normal change rate
      },
      
      recentBaseline: [],
      
      detectAnomalies(currentMetrics, historicalAverage) {
        const anomalies = [];
        
        // Crowd surge detection
        if (currentMetrics.clusterCount > historicalAverage.clusterCount * this.thresholds.crowdSurge) {
          anomalies.push({
            type: 'crowd_surge',
            severity: 'high',
            currentValue: currentMetrics.clusterCount,
            expectedValue: historicalAverage.clusterCount,
            ratio: currentMetrics.clusterCount / historicalAverage.clusterCount
          });
        }
        
        // Unusual dwell time
        if (currentMetrics.dwellTimeAvg > historicalAverage.dwellTimeAvg * this.thresholds.unusualDwell) {
          anomalies.push({
            type: 'unusual_dwell',
            severity: 'medium',
            currentValue: currentMetrics.dwellTimeAvg,
            expectedValue: historicalAverage.dwellTimeAvg,
            ratio: currentMetrics.dwellTimeAvg / historicalAverage.dwellTimeAvg
          });
        }
        
        // Flow pattern changes
        if (currentMetrics.flowDirection !== historicalAverage.flowDirection) {
          anomalies.push({
            type: 'flow_change',
            severity: 'low',
            currentPattern: currentMetrics.flowDirection,
            expectedPattern: historicalAverage.flowDirection
          });
        }
        
        return anomalies;
      }
    };
  }

  /**
   * Start aggregation timers for different time windows
   */
  startAggregationTimers() {
    // Immediate aggregation (30 seconds)
    setInterval(() => {
      this.aggregateWindow('immediate', 30000);
    }, 5000);
    
    // Short-term aggregation (5 minutes)
    setInterval(() => {
      this.aggregateWindow('short', 300000);
    }, 60000);
    
    // Medium-term aggregation (30 minutes)
    setInterval(() => {
      this.aggregateWindow('medium', 1800000);
    }, 300000);
    
    // Long-term aggregation (2 hours)
    setInterval(() => {
      this.aggregateWindow('long', 7200000);
    }, 1800000);
  }

  /**
   * Analyze a single vision pipeline frame
   */
  async analyzeFrame(visionResults) {
    const startTime = Date.now();
    
    try {
      // Extract key metrics from vision results
      const frameMetrics = this.extractFrameMetrics(visionResults);
      
      // Add temporal context
      frameMetrics.timeOfDay = this.getTimeOfDay();
      frameMetrics.dayOfWeek = new Date().getDay();
      frameMetrics.timestamp = visionResults.timestamp;
      
      // Add environmental context
      frameMetrics.environmentalContext = await this.getEnvironmentalContext();
      
      // Store in recent frames buffer
      this.addToRecentFrames(frameMetrics);
      
      // Calculate aggregated context
      const aggregatedContext = this.calculateAggregatedContext(frameMetrics);
      
      // Detect anomalies
      const anomalies = this.detectContextAnomalies(aggregatedContext);
      
      // Generate insights
      const insights = this.generateInsights(aggregatedContext, anomalies);
      
      // Update current context
      this.currentContext = {
        ...aggregatedContext,
        anomalies: anomalies,
        insights: insights,
        lastUpdate: Date.now(),
        processingTime: Date.now() - startTime
      };
      
      // Update metrics
      this.updateMetrics(frameMetrics);
      
      return this.currentContext;
      
    } catch (error) {
      this.log(`Context analysis error: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract key metrics from vision pipeline results
   */
  extractFrameMetrics(visionResults) {
    return {
      // Crowd metrics
      clusterCount: visionResults.clusters?.length || 0,
      totalPeople: visionResults.peopleCount || 0,
      avgDensity: this.calculateAverageDensity(visionResults.clusters),
      
      // Flow metrics
      flowDirection: visionResults.flowAnalysis?.dominantDirection || 'unknown',
      flowIntensity: visionResults.flowAnalysis?.flowIntensity || 0,
      averageSpeed: visionResults.flowAnalysis?.averageSpeed || 0,
      
      // Dwell metrics
      dwellTimeAvg: this.estimateDwellTime(visionResults.clusters),
      dwellTimeMax: this.estimateMaxDwellTime(visionResults.clusters),
      
      // Engagement metrics
      engagementScore: visionResults.engagementMetrics?.average_engagement || 0,
      attentionRate: visionResults.engagementMetrics?.attention_rate || 0,
      
      // Demographics (if available)
      demographics: visionResults.demographics,
      
      // Quality metrics
      confidence: visionResults.confidence || 0,
      processingTime: visionResults.processingTime || 0
    };
  }

  /**
   * Calculate average density from clusters
   */
  calculateAverageDensity(clusters) {
    if (!clusters || clusters.length === 0) return 0;
    
    const totalDensity = clusters.reduce((sum, cluster) => sum + (cluster.density || 0), 0);
    return totalDensity / clusters.length;
  }

  /**
   * Estimate dwell time based on cluster stability
   */
  estimateDwellTime(clusters) {
    if (!clusters || clusters.length === 0) return 0;
    
    // Mock dwell time estimation - in real implementation would track clusters over time
    return clusters.reduce((sum, cluster) => {
      // Larger, denser clusters likely indicate longer dwell times
      const estimatedDwell = Math.min(cluster.size * cluster.density * 30, 300); // Max 5 minutes
      return sum + estimatedDwell;
    }, 0) / clusters.length;
  }

  /**
   * Estimate maximum dwell time
   */
  estimateMaxDwellTime(clusters) {
    if (!clusters || clusters.length === 0) return 0;
    
    return Math.max(...clusters.map(cluster => 
      Math.min(cluster.size * cluster.density * 45, 600) // Max 10 minutes
    ));
  }

  /**
   * Get current time of day context
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    
    for (const [period, config] of Object.entries(TIME_PATTERNS)) {
      if (config.start <= config.end) {
        if (hour >= config.start && hour < config.end) return period;
      } else {
        if (hour >= config.start || hour < config.end) return period;
      }
    }
    
    return 'unknown';
  }

  /**
   * Get environmental context (weather, lighting, etc.)
   */
  async getEnvironmentalContext() {
    // Mock environmental data - in real implementation would integrate with weather APIs
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 20;
    
    return {
      lighting: isDay ? 'daylight' : 'artificial',
      weather: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      temperature: 15 + Math.random() * 20, // 15-35°C
      humidity: 40 + Math.random() * 40, // 40-80%
      windSpeed: Math.random() * 10, // 0-10 m/s
      visibility: Math.random() > 0.1 ? 'good' : 'poor' // 90% good visibility
    };
  }

  /**
   * Add frame to recent frames buffer
   */
  addToRecentFrames(frameMetrics) {
    this.recentFrames.push(frameMetrics);
    
    // Keep only recent frames
    if (this.recentFrames.length > this.maxRecentFrames) {
      this.recentFrames.shift();
    }
    
    // Add to appropriate aggregation windows
    const now = Date.now();
    Object.keys(this.aggregationWindows).forEach(window => {
      this.aggregationWindows[window].push({
        ...frameMetrics,
        timestamp: now
      });
    });
  }

  /**
   * Calculate aggregated context from recent frames
   */
  calculateAggregatedContext(currentFrame) {
    const recentMetrics = this.getRecentMetrics(30000); // Last 30 seconds
    
    if (recentMetrics.length === 0) {
      return {
        clusterCount: currentFrame.clusterCount,
        avgDensity: currentFrame.avgDensity,
        flowDirection: currentFrame.flowDirection,
        dwellTimeAvg: currentFrame.dwellTimeAvg,
        engagementScore: currentFrame.engagementScore,
        trends: {},
        stability: 'unknown'
      };
    }
    
    // Calculate aggregated values
    const aggregated = {
      clusterCount: Math.round(this.average(recentMetrics, 'clusterCount')),
      avgDensity: this.average(recentMetrics, 'avgDensity'),
      flowDirection: this.getDominantFlowDirection(recentMetrics),
      dwellTimeAvg: this.average(recentMetrics, 'dwellTimeAvg'),
      engagementScore: this.average(recentMetrics, 'engagementScore'),
      attentionRate: this.average(recentMetrics, 'attentionRate'),
      
      // Trend analysis
      trends: {
        crowdTrend: this.calculateTrend(recentMetrics, 'clusterCount'),
        densityTrend: this.calculateTrend(recentMetrics, 'avgDensity'),
        engagementTrend: this.calculateTrend(recentMetrics, 'engagementScore')
      },
      
      // Stability metrics
      stability: this.calculateStability(recentMetrics),
      
      // Peak detection
      peakMetrics: this.detectPeaks(recentMetrics),
      
      // Environmental context
      ambientLight: currentFrame.environmentalContext?.lighting,
      weatherConditions: currentFrame.environmentalContext?.weather
    };
    
    return aggregated;
  }

  /**
   * Get metrics from recent frames within time window
   */
  getRecentMetrics(timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    return this.recentFrames.filter(frame => frame.timestamp >= cutoff);
  }

  /**
   * Calculate average of a metric across frames
   */
  average(frames, metric) {
    if (frames.length === 0) return 0;
    return frames.reduce((sum, frame) => sum + (frame[metric] || 0), 0) / frames.length;
  }

  /**
   * Get dominant flow direction from recent frames
   */
  getDominantFlowDirection(frames) {
    if (frames.length === 0) return 'unknown';
    
    const directions = {};
    frames.forEach(frame => {
      const dir = frame.flowDirection || 'unknown';
      directions[dir] = (directions[dir] || 0) + 1;
    });
    
    return Object.keys(directions).reduce((a, b) => 
      directions[a] > directions[b] ? a : b
    );
  }

  /**
   * Calculate trend for a specific metric
   */
  calculateTrend(frames, metric) {
    if (frames.length < 2) return 'stable';
    
    const values = frames.map(f => f[metric] || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate stability of metrics
   */
  calculateStability(frames) {
    if (frames.length < 3) return 'unknown';
    
    const crowdStability = this.calculateVarianceStability(frames, 'clusterCount');
    const densityStability = this.calculateVarianceStability(frames, 'avgDensity');
    const flowStability = this.calculateFlowStability(frames);
    
    const overallStability = (crowdStability + densityStability + flowStability) / 3;
    
    if (overallStability > 0.8) return 'very_stable';
    if (overallStability > 0.6) return 'stable';
    if (overallStability > 0.4) return 'moderate';
    if (overallStability > 0.2) return 'unstable';
    return 'very_unstable';
  }

  /**
   * Calculate variance-based stability for a metric
   */
  calculateVarianceStability(frames, metric) {
    const values = frames.map(f => f[metric] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const coefficient = mean > 0 ? Math.sqrt(variance) / mean : 1;
    
    return Math.max(0, 1 - coefficient); // Lower variance = higher stability
  }

  /**
   * Calculate flow direction stability
   */
  calculateFlowStability(frames) {
    const directions = frames.map(f => f.flowDirection);
    const uniqueDirections = new Set(directions);
    
    return 1 - (uniqueDirections.size - 1) / Math.max(directions.length - 1, 1);
  }

  /**
   * Detect peaks in recent data
   */
  detectPeaks(frames) {
    if (frames.length < 5) return null;
    
    const crowdValues = frames.map(f => f.clusterCount || 0);
    const peakCrowd = Math.max(...crowdValues);
    const avgCrowd = crowdValues.reduce((a, b) => a + b, 0) / crowdValues.length;
    
    return {
      peakCrowdSize: peakCrowd,
      peakCrowdRatio: avgCrowd > 0 ? peakCrowd / avgCrowd : 1,
      isPeakDetected: peakCrowd > avgCrowd * 1.5,
      timeOfPeak: frames[crowdValues.indexOf(peakCrowd)]?.timestamp
    };
  }

  /**
   * Detect context anomalies
   */
  detectContextAnomalies(context) {
    const historicalAverage = this.getHistoricalAverage();
    
    if (!historicalAverage) {
      return []; // No historical data yet
    }
    
    return this.anomalyDetector.detectAnomalies(context, historicalAverage);
  }

  /**
   * Get historical average for comparison
   */
  getHistoricalAverage() {
    const relevantData = this.getRelevantHistoricalData();
    
    if (relevantData.length === 0) return null;
    
    return {
      clusterCount: this.average(relevantData, 'clusterCount'),
      avgDensity: this.average(relevantData, 'avgDensity'),
      dwellTimeAvg: this.average(relevantData, 'dwellTimeAvg'),
      engagementScore: this.average(relevantData, 'engagementScore'),
      flowDirection: this.getDominantFlowDirection(relevantData)
    };
  }

  /**
   * Get relevant historical data for current context
   */
  getRelevantHistoricalData() {
    // Get data from same time of day and day of week
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    return Array.from(this.historicalData.values()).filter(data => {
      const dataDate = new Date(data.timestamp);
      const dataHour = dataDate.getHours();
      const dataDay = dataDate.getDay();
      
      // Same hour (±1) and same day of week
      return Math.abs(dataHour - currentHour) <= 1 && dataDay === currentDay;
    });
  }

  /**
   * Generate actionable insights
   */
  generateInsights(context, anomalies) {
    const insights = [];
    
    // Crowd density insights
    if (context.clusterCount > 10) {
      insights.push({
        type: 'high_traffic',
        message: 'High crowd density detected - optimal time for premium content',
        confidence: 0.8,
        recommendation: 'display_premium_content'
      });
    } else if (context.clusterCount < 2) {
      insights.push({
        type: 'low_traffic',
        message: 'Low crowd density - consider attention-grabbing content',
        confidence: 0.7,
        recommendation: 'display_attention_content'
      });
    }
    
    // Engagement insights
    if (context.engagementScore > 0.7) {
      insights.push({
        type: 'high_engagement',
        message: 'High audience engagement detected',
        confidence: 0.9,
        recommendation: 'extend_content_duration'
      });
    }
    
    // Flow insights
    if (context.trends.crowdTrend === 'increasing') {
      insights.push({
        type: 'crowd_building',
        message: 'Crowd is building - prepare for increased viewership',
        confidence: 0.8,
        recommendation: 'prepare_high_impact_content'
      });
    }
    
    // Anomaly insights
    anomalies.forEach(anomaly => {
      insights.push({
        type: 'anomaly_detected',
        message: `Anomaly detected: ${anomaly.type}`,
        confidence: 0.9,
        recommendation: 'monitor_situation',
        anomalyDetails: anomaly
      });
    });
    
    // Time-based insights
    const timeOfDay = this.getTimeOfDay();
    const timePattern = TIME_PATTERNS[timeOfDay];
    if (timePattern && context.clusterCount > timePattern.density * 15) {
      insights.push({
        type: 'above_normal_traffic',
        message: `Above normal traffic for ${timeOfDay}`,
        confidence: 0.7,
        recommendation: 'capitalize_on_traffic'
      });
    }
    
    return insights;
  }

  /**
   * Aggregate data for a specific time window
   */
  aggregateWindow(windowName, windowDurationMs) {
    const window = this.aggregationWindows[windowName];
    const cutoff = Date.now() - windowDurationMs;
    
    // Remove old data
    this.aggregationWindows[windowName] = window.filter(item => item.timestamp >= cutoff);
    
    // Store aggregated historical data
    if (window.length > 0) {
      const aggregated = {
        timestamp: Date.now(),
        windowType: windowName,
        duration: windowDurationMs,
        clusterCount: this.average(window, 'clusterCount'),
        avgDensity: this.average(window, 'avgDensity'),
        dwellTimeAvg: this.average(window, 'dwellTimeAvg'),
        engagementScore: this.average(window, 'engagementScore'),
        flowDirection: this.getDominantFlowDirection(window)
      };
      
      this.historicalData.set(`${windowName}_${Date.now()}`, aggregated);
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics(frameMetrics) {
    this.metrics.framesAnalyzed++;
    this.metrics.totalPeopleDetected += frameMetrics.totalPeople;
    this.metrics.peakCrowdSize = Math.max(this.metrics.peakCrowdSize, frameMetrics.clusterCount);
    this.metrics.lastUpdate = Date.now();
    
    // Update average processing time
    if (frameMetrics.processingTime) {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + frameMetrics.processingTime) / 2;
    }
  }

  /**
   * Get total frames processed
   */
  getTotalFrames() {
    return this.metrics.framesAnalyzed;
  }

  /**
   * Get current context
   */
  getCurrentContext() {
    return this.currentContext;
  }

  /**
   * Run diagnostics on context analyzer
   */
  async runDiagnostics() {
    return {
      analyzer_status: 'active',
      billboard_id: this.billboardId,
      location: this.location,
      retention_hours: this.retentionHours,
      frames_analyzed: this.metrics.framesAnalyzed,
      total_people_detected: this.metrics.totalPeopleDetected,
      peak_crowd_size: this.metrics.peakCrowdSize,
      recent_frames_count: this.recentFrames.length,
      historical_data_points: this.historicalData.size,
      aggregation_windows: Object.fromEntries(
        Object.entries(this.aggregationWindows).map(([key, value]) => [key, value.length])
      ),
      anomaly_detector_status: 'active',
      last_update: this.metrics.lastUpdate,
      average_processing_time: this.metrics.averageProcessingTime
    };
  }

  /**
   * Cleanup context analyzer
   */
  async cleanup() {
    this.log('Cleaning up context analyzer...');
    
    // Clear all data
    this.recentFrames = [];
    this.historicalData.clear();
    Object.keys(this.aggregationWindows).forEach(key => {
      this.aggregationWindows[key] = [];
    });
    
    this.log('Context analyzer cleanup complete');
  }

  /**
   * Logging helper
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Context ${level.toUpperCase()}] ${message}`);
  }
}

export default ContextAnalyzer;