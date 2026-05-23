const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { getDb, initSchema } = require('./src/db');
const { seed } = require('./src/seed');

const authRoutes = require('./src/routes/auth');
const marketRoutes = require('./src/routes/markets');
const competitorRoutes = require('./src/routes/competitors');
const pricingRoutes = require('./src/routes/pricing');
const analysisRoutes = require('./src/routes/analysis');
const strategyRoutes = require('./src/routes/strategies');
const reportRoutes = require('./src/routes/reports');
const adminRoutes = require('./src/routes/admin');
const dashboardRoutes = require('./src/routes/dashboard');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.app.set('io', io);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await getDb();
  initSchema();
  seed();
  server.listen(PORT, () => {
    console.log(`CompetitorIQ Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
