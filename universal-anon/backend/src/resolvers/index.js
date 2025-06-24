/**
 * GraphQL Resolvers for Anonymous Intent Graph API
 * Handles event ingestion, analytics, and privacy management
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { AuthenticationError, ValidationError, ForbiddenError } from 'apollo-server-errors';
import { withFilter } from 'graphql-subscriptions';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import logger from '../utils/logger.js';
import { validateApiKey } from '../middleware/auth.js';

// Custom UUID scalar
const UUIDType = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID scalar type',
  serialize: (value) => value,
  parseValue: (value) => {
    if (typeof value !== 'string' || !isValidUUID(value)) {
      throw new Error('Invalid UUID format');
    }
    return value;
  },
  parseLiteral: (ast) => {
    if (ast.kind !== Kind.STRING || !isValidUUID(ast.value)) {
      throw new Error('Invalid UUID format');
    }
    return ast.value;
  }
});

function isValidUUID(value) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Validation schemas
const eventInputSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  eventName: Joi.string().required(),
  anonId: Joi.string().pattern(/^anon-[0-9a-f-]+$/).required(),
  sessionId: Joi.string().uuid().required(),
  timestamp: Joi.date().iso().required(),
  properties: Joi.object().optional(),
  deviceMeta: Joi.object().optional(),
  geo: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().optional(),
    altitude: Joi.number().optional(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional()
  }).optional(),
  platform: Joi.string().valid('WEB', 'REACT_NATIVE', 'IOS', 'ANDROID', 'NODE').required(),
  environment: Joi.string().valid('PRODUCTION', 'STAGING', 'DEVELOPMENT').required(),
  sdkVersion: Joi.string().optional()
});

export const resolvers = {
  // Scalar type resolvers
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  UUID: UUIDType,

  // Query resolvers
  Query: {
    // Analytics and Insights
    async getIntentTrends(parent, { filter }, { dataSources, user }) {
      try {
        // Validate API access
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const trends = await dataSources.intentAnalyzer.getIntentTrends(filter);
        return trends;
      } catch (error) {
        logger.error('Error getting intent trends:', error);
        throw error;
      }
    },

    async getSessionMetrics(parent, { anonId, sessionId, limit = 100 }, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const metrics = await dataSources.intentAnalyzer.getSessionMetrics({
          anonId,
          sessionId,
          limit
        });
        return metrics;
      } catch (error) {
        logger.error('Error getting session metrics:', error);
        throw error;
      }
    },

    async getAnalyticsMetrics(parent, { filter }, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const metrics = await dataSources.intentAnalyzer.getAnalyticsMetrics(filter);
        return metrics;
      } catch (error) {
        logger.error('Error getting analytics metrics:', error);
        throw error;
      }
    },

    // Real-time data
    async getLiveEventCount(parent, args, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const count = await dataSources.streamProcessor.getLiveEventCount();
        return count;
      } catch (error) {
        logger.error('Error getting live event count:', error);
        throw error;
      }
    },

    async getActiveSessions(parent, args, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const count = await dataSources.streamProcessor.getActiveSessions();
        return count;
      } catch (error) {
        logger.error('Error getting active sessions:', error);
        throw error;
      }
    },

    // Privacy and Compliance
    async getDataRetentionInfo(parent, { anonId }, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const info = await dataSources.eventIngestionService.getDataRetentionInfo(anonId);
        return info;
      } catch (error) {
        logger.error('Error getting data retention info:', error);
        throw error;
      }
    },

    // Health and Status
    async getSystemHealth(parent, args, { dataSources }) {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            eventIngestion: await dataSources.eventIngestionService.getHealthStatus(),
            streamProcessor: await dataSources.streamProcessor.getHealthStatus(),
            intentAnalyzer: await dataSources.intentAnalyzer.getHealthStatus()
          }
        };
        return health;
      } catch (error) {
        logger.error('Error getting system health:', error);
        throw error;
      }
    }
  },

  // Mutation resolvers
  Mutation: {
    // Event Tracking
    async trackIntentEvents(parent, { input }, { dataSources, user, req }) {
      try {
        // Validate API key from context or input
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        // Validate input events
        const validationErrors = [];
        const validEvents = [];

        for (let i = 0; i < input.length; i++) {
          try {
            const { error, value } = eventInputSchema.validate(input[i]);
            if (error) {
              validationErrors.push(`Event ${i}: ${error.details[0].message}`);
              continue;
            }

            // Additional business logic validation
            const event = value;
            
            // Validate timestamp is not too far in future
            const eventTime = new Date(event.timestamp);
            const now = new Date();
            if (eventTime > new Date(now.getTime() + 5 * 60 * 1000)) { // 5 minutes future
              validationErrors.push(`Event ${i}: Timestamp too far in future`);
              continue;
            }

            // Normalize and enrich event
            const normalizedEvent = {
              ...event,
              processedAt: now.toISOString(),
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              // Add any server-side enrichments
            };

            validEvents.push(normalizedEvent);
          } catch (err) {
            validationErrors.push(`Event ${i}: ${err.message}`);
          }
        }

        if (validEvents.length === 0) {
          throw new ValidationError('No valid events to process');
        }

        // Process events through ingestion service
        const result = await dataSources.eventIngestionService.ingestEvents(
          validEvents, 
          user.apiKey
        );

        // Send events to real-time stream
        await dataSources.streamProcessor.sendEvents(validEvents);

        // Process events for intent analysis
        await dataSources.intentAnalyzer.processEvents(validEvents);

        return {
          success: true,
          eventIds: validEvents.map(e => e.eventId),
          errors: validationErrors,
          processedCount: validEvents.length,
          clustersGenerated: result.clustersGenerated || []
        };

      } catch (error) {
        logger.error('Error tracking intent events:', error);
        throw error;
      }
    },

    // Privacy and Consent Management
    async updateConsentStatus(parent, { anonId, hasConsent }, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        const result = await dataSources.eventIngestionService.updateConsentStatus(
          anonId, 
          hasConsent
        );

        return {
          success: true,
          anonId,
          status: hasConsent ? 'consented' : 'revoked',
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        logger.error('Error updating consent status:', error);
        throw error;
      }
    },

    async deleteUserData(parent, { anonId }, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        await dataSources.eventIngestionService.deleteUserData(anonId);

        return {
          success: true,
          anonId,
          status: 'deleted',
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        logger.error('Error deleting user data:', error);
        throw error;
      }
    },

    // Data Management
    async purgeExpiredData(parent, args, { dataSources, user }) {
      try {
        if (!user || !user.apiKey) {
          throw new AuthenticationError('API key required');
        }

        // Only allow admin users to purge data
        if (!user.isAdmin) {
          throw new ForbiddenError('Admin access required');
        }

        const result = await dataSources.eventIngestionService.purgeExpiredData();
        return result;
      } catch (error) {
        logger.error('Error purging expired data:', error);
        throw error;
      }
    }
  },

  // Subscription resolvers
  Subscription: {
    // Real-time intent events
    intentEventStream: {
      subscribe: withFilter(
        (parent, args, { pubsub }) => pubsub.asyncIterator(['INTENT_EVENT']),
        (payload, variables) => {
          // Filter events based on subscription criteria
          if (!variables.filter) return true;
          
          const event = payload.intentEventStream;
          const filter = variables.filter;

          if (filter.platform && event.platform !== filter.platform) {
            return false;
          }
          if (filter.environment && event.environment !== filter.environment) {
            return false;
          }
          if (filter.eventTypes && !filter.eventTypes.includes(event.eventName)) {
            return false;
          }

          return true;
        }
      )
    },

    // Live metrics updates
    liveMetricsUpdate: {
      subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator(['METRICS_UPDATE'])
    },

    // Intent trend changes
    intentTrendUpdate: {
      subscribe: withFilter(
        (parent, args, { pubsub }) => pubsub.asyncIterator(['TREND_UPDATE']),
        (payload, variables) => {
          if (!variables.region) return true;
          return payload.intentTrendUpdate.region === variables.region;
        }
      )
    }
  }
};