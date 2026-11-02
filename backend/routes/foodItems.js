const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/food-items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await all('SELECT * FROM food_items ORDER BY created_at DESC');
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/food-items/alerts/low-stock
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const items = await all('SELECT * FROM food_items WHERE available_stock <= min_stock_level ORDER BY available_stock ASC');
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/food-items/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await get('SELECT * FROM food_items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Food item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/food-items
router.post('/', authenticateToken, async (req, res) => {
  const { name, quantity_received, unit, min_stock_level, date_of_receipt, category, notes } = req.body;
  if (!name || !quantity_received || !unit || !date_of_receipt)
    return res.status(400).json({ error: 'Name, quantity, unit, and date are required' });
  if (parseFloat(quantity_received) <= 0)
    return res.status(400).json({ error: 'Quantity must be greater than 0' });

  try {
    const qty = parseFloat(quantity_received);
    const result = await run(
      `INSERT INTO food_items (name,quantity_received,available_stock,unit,min_stock_level,date_of_receipt,category,notes) VALUES (?,?,?,?,?,?,?,?)`,
      [name.trim(), qty, qty, unit, parseFloat(min_stock_level) || 5, date_of_receipt, category || 'grain', notes || null]
    );
    const item = await get('SELECT * FROM food_items WHERE id = ?', [result.lastID]);
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/food-items/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM food_items WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Food item not found' });

    const { name, quantity_received, available_stock, unit, min_stock_level, date_of_receipt, category, notes } = req.body;
    await run(
      `UPDATE food_items SET name=?,quantity_received=?,available_stock=?,unit=?,min_stock_level=?,date_of_receipt=?,category=?,notes=?,updated_at=datetime('now','localtime') WHERE id=?`,
      [
        name || existing.name,
        parseFloat(quantity_received) || existing.quantity_received,
        available_stock !== undefined ? parseFloat(available_stock) : existing.available_stock,
        unit || existing.unit,
        parseFloat(min_stock_level) || existing.min_stock_level,
        date_of_receipt || existing.date_of_receipt,
        category || existing.category,
        notes !== undefined ? notes : existing.notes,
        req.params.id
      ]
    );
    const updated = await get('SELECT * FROM food_items WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/food-items/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only administrators can delete food items' });

  try {
    const item = await get('SELECT * FROM food_items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Food item not found' });
    await run('DELETE FROM food_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Food item deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
