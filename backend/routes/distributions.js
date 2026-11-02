const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/distributions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, foodItemId, search } = req.query;
    let query = 'SELECT * FROM distributions WHERE 1=1';
    const params = [];

    if (startDate) { query += ' AND distribution_date >= ?'; params.push(startDate); }
    if (endDate)   { query += ' AND distribution_date <= ?'; params.push(endDate); }
    if (foodItemId){ query += ' AND food_item_id = ?'; params.push(foodItemId); }
    if (search)    { query += ' AND (food_item_name LIKE ? OR remarks LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY distribution_date DESC, created_at DESC LIMIT 200';
    const records = await all(query, params);
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/distributions
router.post('/', authenticateToken, async (req, res) => {
  const { food_item_id, distribution_date, quantity_distributed, children_served, mothers_served, remarks } = req.body;

  if (!food_item_id || !distribution_date || !quantity_distributed)
    return res.status(400).json({ error: 'Food item, date, and quantity are required' });
  if (parseFloat(quantity_distributed) <= 0)
    return res.status(400).json({ error: 'Quantity must be greater than 0' });

  try {
    const foodItem = await get('SELECT * FROM food_items WHERE id = ?', [food_item_id]);
    if (!foodItem) return res.status(404).json({ error: 'Food item not found' });

    const qty = parseFloat(quantity_distributed);
    if (qty > foodItem.available_stock)
      return res.status(400).json({
        error: `Insufficient stock. Available: ${foodItem.available_stock} ${foodItem.unit}`,
        available: foodItem.available_stock
      });

    const newStock = parseFloat((foodItem.available_stock - qty).toFixed(3));

    await run(`UPDATE food_items SET available_stock=?,updated_at=datetime('now','localtime') WHERE id=?`, [newStock, food_item_id]);

    const result = await run(
      `INSERT INTO distributions (food_item_id,food_item_name,distribution_date,quantity_distributed,children_served,mothers_served,remaining_stock,remarks,created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
      [food_item_id, foodItem.name, distribution_date, qty,
       parseInt(children_served)||0, parseInt(mothers_served)||0,
       newStock, remarks||null, req.user.id]
    );

    const record = await get('SELECT * FROM distributions WHERE id = ?', [result.lastID]);
    const updatedFood = await get('SELECT * FROM food_items WHERE id = ?', [food_item_id]);
    res.status(201).json({ distribution: record, updatedFoodItem: updatedFood });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/distributions/:id  (admin only — edit metadata, not qty)
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only administrators can edit distribution records' });

  try {
    const existing = await get('SELECT * FROM distributions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const { children_served, mothers_served, remarks, distribution_date } = req.body;
    await run(
      `UPDATE distributions SET children_served=?,mothers_served=?,remarks=?,distribution_date=? WHERE id=?`,
      [
        parseInt(children_served)!==undefined ? parseInt(children_served) : existing.children_served,
        parseInt(mothers_served)!==undefined  ? parseInt(mothers_served)  : existing.mothers_served,
        remarks!==undefined ? remarks : existing.remarks,
        distribution_date || existing.distribution_date,
        req.params.id
      ]
    );
    const updated = await get('SELECT * FROM distributions WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/distributions/:id (admin — restores stock)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only administrators can delete records' });

  try {
    const record = await get('SELECT * FROM distributions WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await run(`UPDATE food_items SET available_stock=available_stock+?,updated_at=datetime('now','localtime') WHERE id=?`,
      [record.quantity_distributed, record.food_item_id]);
    await run('DELETE FROM distributions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Record deleted and stock restored' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/distributions/summary/stats
router.get('/summary/stats', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year  || new Date().getFullYear();
    const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
    const ym = `${y}-${m}`;

    const totalDistributed  = await get(`SELECT SUM(quantity_distributed) as total FROM distributions WHERE strftime('%Y-%m',distribution_date)=?`, [ym]);
    const totalBeneficiaries = await get(`SELECT SUM(children_served) as children,SUM(mothers_served) as mothers FROM distributions WHERE strftime('%Y-%m',distribution_date)=?`, [ym]);
    const byItem = await all(`SELECT food_item_name,SUM(quantity_distributed) as total_distributed,SUM(children_served) as children,SUM(mothers_served) as mothers FROM distributions WHERE strftime('%Y-%m',distribution_date)=? GROUP BY food_item_name ORDER BY total_distributed DESC`, [ym]);
    const dailyChart = await all(`SELECT distribution_date as date,SUM(quantity_distributed) as total_quantity,SUM(children_served) as children,SUM(mothers_served) as mothers FROM distributions WHERE strftime('%Y-%m',distribution_date)=? GROUP BY distribution_date ORDER BY distribution_date ASC`, [ym]);
    const monthlyChart = await all(`SELECT strftime('%Y-%m',distribution_date) as month,SUM(quantity_distributed) as total_quantity,SUM(children_served) as children,SUM(mothers_served) as mothers FROM distributions WHERE strftime('%Y',distribution_date)=? GROUP BY month ORDER BY month ASC`, [String(y)]);

    res.json({ period: ym, totalDistributed: totalDistributed?.total||0, totalChildren: totalBeneficiaries?.children||0, totalMothers: totalBeneficiaries?.mothers||0, byItem, dailyChart, monthlyChart });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/distributions/sync-offline
router.post('/sync-offline', authenticateToken, async (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records))
    return res.status(400).json({ error: 'Records array required' });

  const synced = [], failed = [];
  for (const record of records) {
    try {
      const foodItem = await get('SELECT * FROM food_items WHERE id = ?', [record.food_item_id]);
      if (!foodItem) { failed.push({ record, reason: 'Food item not found' }); continue; }
      const qty = parseFloat(record.quantity_distributed);
      if (qty > foodItem.available_stock) { failed.push({ record, reason: 'Insufficient stock' }); continue; }

      const newStock = parseFloat((foodItem.available_stock - qty).toFixed(3));
      await run(`UPDATE food_items SET available_stock=? WHERE id=?`, [newStock, record.food_item_id]);
      const result = await run(
        `INSERT INTO distributions (food_item_id,food_item_name,distribution_date,quantity_distributed,children_served,mothers_served,remaining_stock,remarks,created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
        [record.food_item_id, foodItem.name, record.distribution_date, qty,
         parseInt(record.children_served)||0, parseInt(record.mothers_served)||0,
         newStock, record.remarks||'Synced from offline', req.user.id]
      );
      synced.push(result.lastID);
    } catch (e) { failed.push({ record, reason: e.message }); }
  }

  res.json({ synced: synced.length, failed: failed.length, failedRecords: failed });
});

module.exports = router;
