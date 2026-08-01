const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config');
const { corsOrigin } = require('./config/cors');
const logger = require('./config/logger');
const prisma = require('./config/database');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    logger.debug('Client joined kitchen room', { socketId: socket.id });
  });

  socket.on('join-dashboard', () => {
    socket.join('dashboard');
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

const checkLowStock = async () => {
  try {
    const ingredients = await prisma.ingredient.findMany();
    const lowStock = ingredients.filter(
      (i) => Number(i.currentStock) <= Number(i.minStock) && Number(i.minStock) > 0
    );

    if (lowStock.length > 0) {
      io.to('dashboard').emit('low-stock-alert', {
        count: lowStock.length,
        items: lowStock.map((i) => ({ name: i.name, current: Number(i.currentStock), min: Number(i.minStock) })),
      });
    }
  } catch (error) {
    logger.warn('Low stock check skipped', { message: error.message });
  }
};

setInterval(checkLowStock, 5 * 60 * 1000);

const start = async () => {
  try {
    fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
    await prisma.$connect();
    logger.info('Database connected');

    const { ensureDemoDataBackfill } = require('./lib/tenant');
    await ensureDemoDataBackfill();

    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message });
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await prisma.$disconnect();
  server.close();
});

module.exports = { server, io };
