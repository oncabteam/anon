/**
 * GraphQL Schema for Anonymous Intent Graph API
 * Defines types, inputs, and operations for intent event tracking
 */

import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON
  scalar UUID

  # Enums
  enum EventType {
    # Behavioral Signals
    TAP_TO_SAVE
    HOVER
    SWIPE_LEFT
    SWIPE_RIGHT
    SCROLL_DEPTH
    ZOOM_IN
    ZOOM_OUT
    LONG_PRESS
    
    # Navigation & Discovery
    PAGE_VIEW
    SEARCH
    FILTER_APPLY
    CATEGORY_BROWSE
    
    # Engagement Signals
    CONTENT_VIEW
    CONTENT_SHARE
    CONTENT_SAVE
    FORM_START
    FORM_ABANDON
    FORM_COMPLETE
    
    # Session & Lifecycle
    SESSION_START
    SESSION_END
    SESSION_IDLE
    APP_BACKGROUND
    APP_FOREGROUND
    
    # Intent Indicators
    PURCHASE_INTENT
    BROWSE_INTENT
    COMPARE_INTENT
    EXIT_INTENT
    
    # Platform Specific
    MAP_MOVE
    MAP_ZOOM
    MAP_FILTER
    VENUE_VIEW
    EVENT_VIEW
    NAVIGATION
    CLICK
    FORM_SUBMIT
    
    # Custom
    CUSTOM
  }

  enum Platform {
    WEB
    REACT_NATIVE
    IOS
    ANDROID
    NODE
  }

  enum Environment {
    PRODUCTION
    STAGING
    DEVELOPMENT
  }

  # Core Types
  type IntentEvent {
    eventId: UUID!
    eventName: EventType!
    anonId: String!
    sessionId: UUID!
    timestamp: DateTime!
    properties: JSON
    deviceMeta: DeviceMeta
    geo: GeoLocation
    platform: Platform!
    environment: Environment!
    sdkVersion: String
    processedAt: DateTime
    clusterId: String
    intentScore: Float
  }

  type DeviceMeta {
    platform: String
    platformOs: String
    platformVersion: String
    deviceWidth: Int
    deviceHeight: Int
    screenWidth: Int
    screenHeight: Int
    deviceScale: Float
    userAgent: String
    language: String
    timezone: String
    isTablet: Boolean
  }

  type GeoLocation {
    lat: Float!
    lng: Float!
    accuracy: Float
    altitude: Float
    heading: Float
    speed: Float
    country: String
    region: String
    city: String
  }

  type IntentTrend {
    category: String!
    activityLevel: Float!
    peakTime: DateTime
    confidence: Float!
    region: String
    period: String!
  }

  type SessionMetrics {
    sessionId: UUID!
    anonId: String!
    startTime: DateTime!
    endTime: DateTime
    duration: Int
    eventCount: Int!
    platform: Platform!
    intentScore: Float
    clusterId: String
  }

  type AnalyticsMetrics {
    totalEvents: Int!
    totalSessions: Int!
    uniqueUsers: Int!
    topEventTypes: [EventTypeMetric!]!
    platformBreakdown: [PlatformMetric!]!
    intentDistribution: [IntentMetric!]!
    timeRange: String!
  }

  type EventTypeMetric {
    eventType: EventType!
    count: Int!
    percentage: Float!
  }

  type PlatformMetric {
    platform: Platform!
    count: Int!
    percentage: Float!
  }

  type IntentMetric {
    category: String!
    score: Float!
    count: Int!
    percentage: Float!
  }

  # Input Types
  input IntentEventInput {
    eventId: UUID!
    eventName: EventType!
    anonId: String!
    sessionId: UUID!
    timestamp: DateTime!
    properties: JSON
    deviceMeta: DeviceMetaInput
    geo: GeoLocationInput
    platform: Platform!
    environment: Environment!
    sdkVersion: String
  }

  input DeviceMetaInput {
    platform: String
    platformOs: String
    platformVersion: String
    deviceWidth: Int
    deviceHeight: Int
    screenWidth: Int
    screenHeight: Int
    deviceScale: Float
    userAgent: String
    language: String
    timezone: String
    isTablet: Boolean
  }

  input GeoLocationInput {
    lat: Float!
    lng: Float!
    accuracy: Float
    altitude: Float
    heading: Float
    speed: Float
  }

  input IntentTrendsFilter {
    region: String
    category: String
    platform: Platform
    timeRange: String
    minConfidence: Float
  }

  input AnalyticsFilter {
    platform: Platform
    environment: Environment
    startDate: DateTime
    endDate: DateTime
    eventTypes: [EventType!]
  }

  # Response Types
  type TrackEventsResponse {
    success: Boolean!
    eventIds: [UUID!]!
    errors: [String!]
    processedCount: Int!
    clustersGenerated: [String!]
  }

  type ConsentManagementResponse {
    success: Boolean!
    anonId: String!
    status: String!
    updatedAt: DateTime!
  }

  # Queries
  type Query {
    # Analytics and Insights
    getIntentTrends(filter: IntentTrendsFilter!): [IntentTrend!]!
    getSessionMetrics(anonId: String, sessionId: UUID, limit: Int = 100): [SessionMetrics!]!
    getAnalyticsMetrics(filter: AnalyticsFilter!): AnalyticsMetrics!
    
    # Real-time data
    getLiveEventCount: Int!
    getActiveSessions: Int!
    
    # Privacy and Compliance
    getDataRetentionInfo(anonId: String!): JSON
    
    # Health and Status
    getSystemHealth: JSON!
  }

  # Mutations
  type Mutation {
    # Event Tracking
    trackIntentEvents(input: [IntentEventInput!]!): TrackEventsResponse!
    
    # Privacy and Consent Management
    updateConsentStatus(anonId: String!, hasConsent: Boolean!): ConsentManagementResponse!
    deleteUserData(anonId: String!): ConsentManagementResponse!
    
    # Data Management
    purgeExpiredData: JSON!
  }

  # Subscriptions (for real-time features)
  type Subscription {
    # Real-time intent events (for dashboard)
    intentEventStream(filter: AnalyticsFilter): IntentEvent!
    
    # Live metrics updates
    liveMetricsUpdate: AnalyticsMetrics!
    
    # Intent trend changes
    intentTrendUpdate(region: String): IntentTrend!
  }
`;