const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { get, all } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart_poshan_secret_key_2026';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/food-items',    require('./routes/foodItems'));
app.use('/api/distributions', require('./routes/distributions'));

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
  try { jwt.verify(authHeader.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  try {
    const totalItems       = await get('SELECT COUNT(*) as count FROM food_items');
    const stockSummary     = await get('SELECT SUM(quantity_received) as total_received, SUM(available_stock) as total_remaining FROM food_items');
    const totalDistributed = await get('SELECT SUM(quantity_distributed) as total FROM distributions');
    const totalBenef       = await get('SELECT SUM(children_served) as children, SUM(mothers_served) as mothers FROM distributions');
    const lowStockItems    = await all('SELECT * FROM food_items WHERE available_stock <= min_stock_level');
    const recentDist       = await all('SELECT * FROM distributions ORDER BY distribution_date DESC, created_at DESC LIMIT 8');
    const foodStockSummary = await all('SELECT * FROM food_items ORDER BY available_stock ASC');
    const monthlyChart     = await all(`
      SELECT strftime('%Y-%m',distribution_date) as month,
             SUM(quantity_distributed) as total_quantity,
             SUM(children_served) as children,
             SUM(mothers_served) as mothers,
             COUNT(*) as records
      FROM distributions
      GROUP BY month ORDER BY month ASC LIMIT 12
    `);

    res.json({
      totalItems:       totalItems.count,
      totalReceived:    stockSummary.total_received  || 0,
      totalDistributed: totalDistributed.total        || 0,
      totalRemaining:   stockSummary.total_remaining  || 0,
      totalChildren:    totalBenef.children           || 0,
      totalMothers:     totalBenef.mothers            || 0,
      lowStockItems,
      recentDistributions: recentDist,
      foodStockSummary,
      monthlyChart
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', message: 'Smart Poshan API is running', timestamp: new Date().toISOString() });
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Wait 500ms for DB init then start
setTimeout(() => {
  app.listen(PORT, () => {
    console.log(`\n🌿 Smart Poshan Backend running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard:  http://localhost:${PORT}/api/dashboard/stats`);
    console.log(`💾 Database:   SQLite (poshan.db)\n`);
  });
}, 500);
