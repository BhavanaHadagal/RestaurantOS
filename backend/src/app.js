const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const { corsOrigin } = require('./config/cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/index');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', async (req, res) => {
  let db = 'ok';
  try {
    const prisma = require('./config/database');
    await prisma.user.count();
  } catch (error) {
    db = error.message;
  }

  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    timestamp: new Date().toISOString(),
    aiServiceUrl: config.aiServiceUrl,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
