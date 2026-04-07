const API = '/api';

let timerInterval = null;
let elapsed = 0;
let isRunning = false;
let isPaused = false;
let isSaving = false;

const els = {
  topicSelect: document.getElementById('topicSelect'),
  newTopicInput: document.getElementById('newTopicInput'),
  addTopicBtn: document.getElementById('addTopicBtn'),
  deleteTopicBtn: document.getElementById('deleteTopicBtn'),
  timerDisplay: document.getElementById('timerDisplay'),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  stopBtn: document.getElementById('stopBtn'),
  resetBtn: document.getElementById('resetBtn'),
  statusText: document.getElementById('statusText'),
  sessionBody: document.getElementById('sessionBody'),
  exportBtn: document.getElementById('exportBtn'),
  chartContainer: document.getElementById('chartContainer'),
  weeklyChart: null
};

// --- Init ---
async function init() {
  await loadTopics();
  await loadSessions();
  await loadWeeklyStats();
  updateButtons();
}

// --- Topics ---
async function loadTopics() {
  const res = await fetch(`${API}/topics`);
  const topics = await res.json();
  els.topicSelect.innerHTML = '<option value="">-- Choose a subject --</option>' +
    topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

els.addTopicBtn.onclick = async () => {
  const name = els.newTopicInput.value.trim();
  if (name.length < 2) return alert('Subject name must be at least 2 characters');
  const res = await fetch(`${API}/topics`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ name })
  });
  if (res.ok) {
    els.newTopicInput.value = '';
    await loadTopics();
  } else {
    alert('Subject already exists');
  }
};

els.newTopicInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.addTopicBtn.click();
});

els.deleteTopicBtn.onclick = async () => {
  const topicId = els.topicSelect.value;
  if (!topicId) return alert('Select a subject first!');
  const topicName = els.topicSelect.options[els.topicSelect.selectedIndex].text;
  if (!confirm(`Delete "${topicName}" and all its sessions?`)) return;
  try {
    await fetch(`${API}/topics/${topicId}`, { method: 'DELETE' });
    els.topicSelect.value = '';
    await loadTopics();
    await loadSessions();
    await loadWeeklyStats();
  } catch (err) {
    alert('Failed to delete topic');
  }
};

// --- Timer Display ---
function updateDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  els.timerDisplay.textContent = `${m}:${s}`;
}

// --- Button States ---
function updateButtons() {
  els.startBtn.disabled = isRunning || isPaused || isSaving;
  els.pauseBtn.disabled = (!isRunning && !isPaused) || isSaving;
  els.stopBtn.disabled = (!isRunning && !isPaused) || isSaving;
  els.resetBtn.disabled = (!isRunning && !isPaused) || isSaving;

  if (isPaused) {
    els.pauseBtn.textContent = 'Resume';
  } else {
    els.pauseBtn.textContent = 'Pause';
  }
}

// --- Start ---
els.startBtn.onclick = () => {
  if (!els.topicSelect.value) return alert('Select a subject first!');
  if (isRunning || isPaused) return;

  isRunning = true;
  isPaused = false;
  elapsed = 0;
  els.statusText.textContent = '🔥 Focusing...';

  timerInterval = setInterval(() => {
    elapsed++;
    updateDisplay(elapsed);
  }, 1000);

  updateButtons();
};

// --- Pause / Resume ---
els.pauseBtn.onclick = () => {
  if (isPaused) {
    // Resume
    isPaused = false;
    isRunning = true;
    els.statusText.textContent = '🔥 Focusing...';

    timerInterval = setInterval(() => {
      elapsed++;
      updateDisplay(elapsed);
    }, 1000);
  } else {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    isPaused = true;
    els.statusText.textContent = '⏸️ Paused';
  }
  updateButtons();
};

// --- Stop & Log ---
els.stopBtn.onclick = async () => {
  if (isSaving) return;

  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  isPaused = false;
  isSaving = true;
  updateButtons();

  const minutes = Math.max(1, Math.ceil(elapsed / 60));

  try {
    const res = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: els.topicSelect.value,
        start_time: new Date().toISOString(),
        duration_minutes: minutes
      })
    });

    if (res.ok) {
      els.statusText.textContent = `✅ Logged ${minutes} min`;
      await loadSessions();
      await loadWeeklyStats();
    } else {
      const err = await res.json();
      els.statusText.textContent = `❌ Error: ${err.error}`;
    }
  } catch (err) {
    els.statusText.textContent = '❌ Network error';
  }

  isSaving = false;
  elapsed = 0;
  updateDisplay(25 * 60);
  els.statusText.textContent = isSaving ? 'Saving...' : 'Ready to focus';
  updateButtons();
};

// --- Reset ---
els.resetBtn.onclick = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning = false;
  isPaused = false;
  elapsed = 0;
  updateDisplay(25 * 60);
  els.statusText.textContent = 'Ready to focus';
  updateButtons();
};

// --- Load Sessions ---
async function loadSessions() {
  try {
    const res = await fetch(`${API}/sessions?limit=10`);
    const sessions = await res.json();
    els.sessionBody.innerHTML = sessions.map(s => `
      <tr>
        <td>${s.topic_name}</td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
        <td>${s.duration_minutes} min</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="color:#94a3b8">No sessions yet. Start one!</td></tr>';
  } catch (err) {
    console.error('Failed to load sessions:', err);
  }
}

// --- Load Weekly Stats ---
async function loadWeeklyStats() {
  try {
    const res = await fetch(`${API}/stats/weekly`);
    const stats = await res.json();
    if (!stats.length) { els.chartContainer.style.display = 'none'; return; }

    els.chartContainer.style.display = 'block';
    if (els.weeklyChart) els.weeklyChart.destroy();

    els.weeklyChart = new Chart(document.getElementById('weeklyChart'), {
      type: 'bar',
      data: {
        labels: stats.map(s => s.topic),
        datasets: [{
          label: 'Minutes (Last 7 Days)',
          data: stats.map(s => s.total_minutes),
          backgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  } catch (err) {
    console.error('Failed to load weekly stats:', err);
  }
}

// --- CSV Export ---
els.exportBtn.onclick = async () => {
  try {
    const res = await fetch(`${API}/sessions?limit=500`);
    const sessions = await res.json();
    let csv = 'Subject,Date,Duration(min)\n';
    sessions.forEach(s => {
      csv += `"${s.topic_name}","${new Date(s.created_at).toLocaleDateString()}",${s.duration_minutes}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study_sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export CSV:', err);
  }
};

init();
