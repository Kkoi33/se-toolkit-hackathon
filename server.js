require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbRun, dbAll, dbGet } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---

// GET /api/topics
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await dbAll('SELECT * FROM topics ORDER BY name');
    res.json(topics);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/topics
app.post('/api/topics', async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
  try {
    await dbRun('INSERT INTO topics (name) VALUES (?)', [name.trim()]);
    const topic = await dbGet('SELECT * FROM topics WHERE name = ?', [name.trim()]);
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ error: 'Topic already exists' });
  }
});

// DELETE /api/topics/:id
app.delete('/api/topics/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbRun('DELETE FROM sessions WHERE topic_id = ?', [id]);
    await dbRun('DELETE FROM topics WHERE id = ?', [id]);
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
  try {
    await dbRun('INSERT INTO sessions (topic_id, start_time, duration_minutes) VALUES (?, ?, ?)',
      [topic_id, start_time, duration_minutes]);
    res.status(201).json({ message: 'Session logged successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sessions (V1 Core)
app.get('/api/sessions', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const sessions = await dbAll(`
      SELECT s.*, t.name as topic_name 
      FROM sessions s JOIN topics t ON s.topic_id = t.id
      ORDER BY s.created_at DESC LIMIT ?
    `, [limit]);
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/weekly (V2 Feature)
app.get('/api/stats/weekly', async (req, res) => {
  try {
    const stats = await dbAll(`
      SELECT t.name as topic, SUM(s.duration_minutes) as total_minutes
      FROM sessions s JOIN topics t ON s.topic_id = t.id
      WHERE s.created_at >= datetime('now', '-7 days')
      GROUP BY t.name ORDER BY total_minutes DESC
    `);
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve frontend on all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ TopicTimer running on http://localhost:${PORT}`));