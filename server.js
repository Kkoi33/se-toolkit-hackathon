require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { dbRun, dbAll, dbGet } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generate or retrieve user ID from header
function getUserId(req) {
  return req.headers['x-user-id'] || null;
}

app.use((req, res, next) => {
  req.userId = getUserId(req);
  next();
});

// GET /api/user/id — returns unique user ID
app.get('/api/user/id', (req, res) => {
  const userId = crypto.randomUUID();
  res.json({ user_id: userId });
});

// --- API Routes ---

// GET /api/topics
app.get('/api/topics', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'User ID required' });
    const topics = await dbAll('SELECT * FROM topics WHERE user_id = ? ORDER BY name', [req.userId]);
    res.json(topics);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/topics
app.post('/api/topics', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
  if (!req.userId) return res.status(401).json({ error: 'User ID required' });
  try {
    await dbRun('INSERT INTO topics (name, user_id) VALUES (?, ?)', [name.trim(), req.userId]);
    const topic = await dbGet('SELECT * FROM topics WHERE name = ? AND user_id = ?', [name.trim(), req.userId]);
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ error: 'Topic already exists' });
  }
});

// DELETE /api/topics/:id
app.delete('/api/topics/:id', async (req, res) => {
  const { id } = req.params;
  if (!req.userId) return res.status(401).json({ error: 'User ID required' });
  try {
    await dbRun('DELETE FROM sessions WHERE topic_id = ? AND user_id = ?', [id, req.userId]);
    const result = await dbRun('DELETE FROM topics WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions (V1 Core)
app.post('/api/sessions', async (req, res) => {
  const { topic_id, start_time, duration_minutes } = req.body;
  if (!topic_id || !start_time || !duration_minutes) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!req.userId) return res.status(401).json({ error: 'User ID required' });
  try {
    await dbRun('INSERT INTO sessions (topic_id, start_time, duration_minutes, user_id) VALUES (?, ?, ?, ?)',
      [topic_id, start_time, duration_minutes, req.userId]);
    res.status(201).json({ message: 'Session logged successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sessions (V1 Core)
app.get('/api/sessions', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'User ID required' });
    const limit = req.query.limit || 20;
    const sessions = await dbAll(`
      SELECT s.*, t.name as topic_name
      FROM sessions s JOIN topics t ON s.topic_id = t.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC LIMIT ?
    `, [req.userId, limit]);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/weekly (V2 Feature)
app.get('/api/stats/weekly', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'User ID required' });
    const stats = await dbAll(`
      SELECT t.name as topic, SUM(s.duration_minutes) as total_minutes
      FROM sessions s JOIN topics t ON s.topic_id = t.id
      WHERE s.user_id = ? AND s.created_at >= datetime('now', '-7 days')
      GROUP BY t.name ORDER BY total_minutes DESC
    `, [req.userId]);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve frontend on all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ TopicTimer running on http://localhost:${PORT}`));