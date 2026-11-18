import mongoose from 'mongoose';
import app from './app.js';
import env from './config/env.js';
import connectDB from './config/db.js';

const start = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`🚀 Server running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
    console.log(`   Health check: http://localhost:${env.port}/api/health`);
  });

  // Graceful shutdown (Render/servers send SIGTERM on deploy or restart)
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

start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
