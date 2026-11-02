const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'poshan.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('Database error:', err); process.exit(1); }
  console.log('✅ Connected to SQLite database:', DB_PATH);
});

// Enable WAL mode and foreign keys
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
});

// ─── Promisify helpers ──────────────────────────────────────────────────────────

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

// ─── Initialize Tables ──────────────────────────────────────────────────────────

const initDb = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity_received REAL NOT NULL DEFAULT 0,
    available_stock REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    min_stock_level REAL NOT NULL DEFAULT 5,
    date_of_receipt TEXT NOT NULL,
    category TEXT DEFAULT 'grain',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_item_id INTEGER NOT NULL,
    food_item_name TEXT NOT NULL,
    distribution_date TEXT NOT NULL,
    quantity_distributed REAL NOT NULL,
    children_served INTEGER DEFAULT 0,
    mothers_served INTEGER DEFAULT 0,
    remaining_stock REAL NOT NULL,
    remarks TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    synced_at TEXT
  )`);

  // ─── Seed Users ───────────────────────────────────────────────────────────────
  const adminHash  = bcrypt.hashSync('admin123', 10);
  const workerHash = bcrypt.hashSync('worker123', 10);
  await run(`INSERT OR IGNORE INTO users (username,password,role,name) VALUES (?,?,?,?)`, ['admin',  adminHash,  'admin',  'Administrator']);
  await run(`INSERT OR IGNORE INTO users (username,password,role,name) VALUES (?,?,?,?)`, ['worker', workerHash, 'worker', 'Anganwadi Worker']);

  // ─── Seed Sample Data ─────────────────────────────────────────────────────────
  const { count } = await get('SELECT COUNT(*) as count FROM food_items');
  if (count === 0) {
    const items = [
      ['Rice (Chawal)',  100, 68, 'kg',     10, '2026-10-01', 'grain',     'Sample demonstration data'],
      ['Dal (Toor)',      50, 32, 'kg',      5, '2026-10-01', 'pulse',     'Sample demonstration data'],
      ['Wheat (Gehun)',   80, 55, 'kg',      8, '2026-10-05', 'grain',     'Sample demonstration data'],
      ['Khichdi Mix',    40, 18, 'kg',      5, '2026-10-10', 'mixed',     'Sample demonstration data'],
      ['Groundnut Oil',  20, 12, 'litre',   3, '2026-10-10', 'oil',       'Sample demonstration data'],
      ['Milk Powder',    15,  3, 'kg',      4, '2026-10-15', 'dairy',     'Sample demonstration data — LOW STOCK'],
      ['Jaggery (Gud)',  10,  7, 'kg',      2, '2026-10-15', 'sweetener', 'Sample demonstration data'],
      ['Chana Dal',      30, 22, 'kg',      5, '2026-10-20', 'pulse',     'Sample demonstration data'],
    ];
    for (const i of items) {
      await run(`INSERT INTO food_items (name,quantity_received,available_stock,unit,min_stock_level,date_of_receipt,category,notes) VALUES (?,?,?,?,?,?,?,?)`, i);
    }

    const dists = [
      [1,'Rice (Chawal)',  '2026-10-05', 5, 25,10, 95,'Morning distribution — sample data'],
      [2,'Dal (Toor)',     '2026-10-05', 3, 25,10, 47,'Morning distribution — sample data'],
      [1,'Rice (Chawal)',  '2026-10-10', 8, 30,12, 87,'Weekly distribution — sample data'],
      [3,'Wheat (Gehun)', '2026-10-10', 5, 30,12, 75,'Weekly distribution — sample data'],
      [4,'Khichdi Mix',   '2026-10-12', 4, 28,11, 36,'Lunch program — sample data'],
      [5,'Groundnut Oil', '2026-10-15', 2, 28,11, 18,'Monthly supply — sample data'],
      [6,'Milk Powder',   '2026-10-15', 3, 32,14, 12,'Weekly supply — sample data'],
      [1,'Rice (Chawal)',  '2026-10-18', 7, 29,11, 80,'Weekly distribution — sample data'],
      [2,'Dal (Toor)',     '2026-10-18', 5, 29,11, 42,'Weekly distribution — sample data'],
      [7,'Jaggery (Gud)', '2026-10-20', 1, 25,10,  9,'Sweet supplement — sample data'],
      [4,'Khichdi Mix',   '2026-10-22', 6, 31,13, 30,'Lunch program — sample data'],
      [6,'Milk Powder',   '2026-10-25', 3, 31,13,  9,'Weekly supply — sample data'],
      [1,'Rice (Chawal)',  '2026-10-28', 5, 27,10, 75,'Weekly distribution — sample data'],
      [8,'Chana Dal',     '2026-10-28', 4, 27,10, 26,'Weekly distribution — sample data'],
      [3,'Wheat (Gehun)', '2026-10-30', 8, 33,14, 67,'End of month — sample data'],
      [6,'Milk Powder',   '2026-11-01', 3, 30,12,  6,'Weekly supply — LOW STOCK — sample data'],
      [1,'Rice (Chawal)',  '2026-11-01', 7, 30,12, 68,'Current week — sample data'],
      [2,'Dal (Toor)',     '2026-11-01', 5, 30,12, 32,'Current week — sample data'],
    ];
    for (const d of dists) {
      await run(`INSERT INTO distributions (food_item_id,food_item_name,distribution_date,quantity_distributed,children_served,mothers_served,remaining_stock,remarks) VALUES (?,?,?,?,?,?,?,?)`, d);
    }
    console.log('✅ Sample data seeded');
  }

  console.log('✅ Database ready');
};

initDb().catch(err => { console.error('DB init error:', err); process.exit(1); });

module.exports = { db, run, get, all };
