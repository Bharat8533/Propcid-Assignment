import app from './app.js';
import { initDb } from './db/index.js';

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await initDb();

  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  EstateDesk Backend API listening on port ${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/health`);
    console.log(`===============================================`);
  });

  const shutdown = () => {
    console.log('\nGracefully shutting down server...');
    server.close(() => {
      console.log('EstateDesk server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
