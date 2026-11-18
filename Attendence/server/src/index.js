import mongoose from 'mongoose';
import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';

/**
 * Main entry point (ES Modules).
 *
 * - Local / non-production: connect to MongoDB and listen on env.port,
 *   with graceful SIGTERM/SIGINT shutdown.
 * - Production on Vercel serverless: app.listen() NEVER runs. MongoDB is
 *   connected on cold start (top-level await) and the Express app is
 *   exported as the default export so @vercel/node can run it as a
 *   serverless function, one request at a time.
 */
const start = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`🚀 Server running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
    console.log(`   Health check: http://localhost:${env.port}/api/health`);
  });

  // Graceful shutdown (servers send SIGTERM on deploy or restart)
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received - shutting down gracefully...`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    server.close(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        /* already disconnected */
      }
      console.log('✅ Closed cleanly.');
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// app.listen() only runs in non-production/local environments -
// never in production and never on Vercel (serverless has no listener).
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  start().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
} else {
  // Serverless cold start: open the MongoDB connection before the platform
  // routes the first request (warm invocations reuse the open connection).
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
}

// @vercel/node runs this module as a serverless function and expects
// the request handler as the default export.
export default app;
