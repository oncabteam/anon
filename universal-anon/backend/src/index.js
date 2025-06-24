/**
 * OnCabaret Anonymous Intent Graph API Server
 * GraphQL gateway for event ingestion with real-time processing
 */

import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { typeDefs } from './schema/index.js';
import { resolvers } from './resolvers/index.js';
import { context } from './context.js';
import { validateApiKey } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { EventIngestionService } from './services/EventIngestionService.js';
import { StreamProcessor } from './services/StreamProcessor.js';
import { IntentAnalyzer } from './services/IntentAnalyzer.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Initialize services
    const eventIngestionService = new EventIngestionService();
    const streamProcessor = new StreamProcessor();
    const intentAnalyzer = new IntentAnalyzer();

    await eventIngestionService.initialize();
    await streamProcessor.initialize();
    await intentAnalyzer.initialize();

    logger.info('Services initialized successfully');

    // Create Express app
    const app = express();
    const httpServer = createServer(app);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false
    }));

    // Compression
    app.use(compression());

    // Logging
    app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    // CORS configuration
    app.use(cors({
      origin: NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : true,
      credentials: true
    }));

    // Rate limiting
    app.use('/graphql', rateLimiter);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // REST fallback endpoint for event ingestion
    app.post('/event', express.json({ limit: '1mb' }), async (req, res) => {
      try {
        const { apiKey, events } = req.body;

        if (!apiKey) {
          return res.status(401).json({
            error: 'API key required',
            code: 'MISSING_API_KEY'
          });
        }

        const isValidKey = await validateApiKey(apiKey);
        if (!isValidKey) {
          return res.status(401).json({
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          });
        }

        if (!events || !Array.isArray(events)) {
          return res.status(400).json({
            error: 'Events array required',
            code: 'INVALID_EVENTS'
          });
        }

        const result = await eventIngestionService.ingestEvents(events, apiKey);
        
        res.json({
          success: true,
          eventsProcessed: result.processedCount,
          errors: result.errors
        });

      } catch (error) {
        logger.error('REST event ingestion error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    });

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: NODE_ENV !== 'production',
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(`GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL Errors:', requestContext.errors);
              }
            };
          }
        }
      ]
    });

    await server.start();

    // Apply GraphQL middleware
    app.use('/graphql', 
      express.json({ limit: '1mb' }),
      expressMiddleware(server, {
        context: async ({ req, res }) => {
          return context({
            req,
            res,
            eventIngestionService,
            streamProcessor,
            intentAnalyzer
          });
        }
      })
    );

    // Error handling middleware
    app.use(errorHandler);

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Anonymous Intent API Server ready at http://localhost:${PORT}/graphql`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔄 REST fallback available at http://localhost:${PORT}/event`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      
      await server.stop();
      await eventIngestionService.cleanup();
      await streamProcessor.cleanup();
      await intentAnalyzer.cleanup();
      
      httpServer.close(() => {
        logger.info('Server shut down successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();