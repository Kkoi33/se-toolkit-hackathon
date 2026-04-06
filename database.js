const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, 'study.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('❌ Database connection error:', err.message);
  else console.log('✅ Connected to SQLite database');
});

// Promisify SQLite methods for clean async/await
const dbRun = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});
const dbAll = (sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbGet = (sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`, (err) => { if (err) console.error('Error creating topics table:', err.message); });
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  )`, (err) => { if (err) console.error('Error creating sessions table:', err.message); });
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error(err.message);
    console.log('\n✅ Database connection closed');
    process.exit(0);
  });
});

module.exports = { dbRun, dbAll, dbGet };