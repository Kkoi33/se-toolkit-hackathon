const API = '/api';
let timerInterval = null;
let startTime = null;
let elapsed = 0;
let isPaused = false;

const els = {
  topicSelect: document.getElementById('topicSelect'),
  newTopicInput: document.getElementById('newTopicInput'),
  addTopicBtn: document.getElementById('addTopicBtn'),
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
  if (!name) return;
  const res = await fetch(`${API}/topics`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
  if (res.ok) { els.newTopicInput.value = ''; await loadTopics(); }
  else alert('Failed to add topic');
};

// --- Timer Logic ---
function updateDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  els.timerDisplay.textContent = `${m}:${s}`;
}

els.startBtn.onclick = () => {
  if (!els.topicSelect.value) return alert('Select a subject first!');
  if (timerInterval) return;
  startTime = Date.now() - (elapsed * 1000);
  els.statusText.textContent = '🔥 Focusing...';
  toggleBtns(false, false, false, false);
  timerInterval = setInterval(() => {
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    updateDisplay(elapsed);
  }, 1000);
};

els.pauseBtn.onclick = () => {
  if (!timerInterval && !isPaused) return;
  if (isPaused) {
    startTime = Date.now() - (elapsed * 1000);
    els.statusText.textContent = '🔥 Focusing...';
    isPaused = false;
    els.pauseBtn.textContent = 'Pause';
    toggleBtns(false, false, false, false);
    timerInterval = setInterval(() => {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      updateDisplay(elapsed);
    }, 1000);
  } else {
    clearInterval(timerInterval);
    timerInterval = null;
    els.statusText.textContent = '⏸️ Paused';
    isPaused = true;
    els.pauseBtn.textContent = 'Resume';
    toggleBtns(false, false, false, false);
  }
};

els.stopBtn.onclick = async () => {
  clearInterval(timerInterval);
  timerInterval = null;
  isPaused = false;
  if (elapsed < 60) {
    els.statusText.textContent = '⚠️ Session too short (min 1 min)';
    setTimeout(() => { els.statusText.textContent = 'Ready to focus'; }, 2000);
    resetTimer();
    return;
  }

  const minutes = Math.round(elapsed / 60);
  try {
    const res = await fetch(`${API}/sessions`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
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
  resetTimer();
};

els.resetBtn.onclick = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  isPaused = false;
  resetTimer();
};

function resetTimer() {
  elapsed = 0; isPaused = false; startTime = null;
  updateDisplay(25 * 60);
  els.statusText.textContent = 'Ready to focus';
  toggleBtns(true, false, false, true);
  els.pauseBtn.textContent = 'Pause';
}

function toggleBtns(start, pause, stop, reset) {
  els.startBtn.disabled = start;
  els.pauseBtn.disabled = pause;
  els.stopBtn.disabled = stop;
  els.resetBtn.disabled = reset;
}

// --- Sessions & Chart (V2) ---
async function loadSessions() {
  const res = await fetch(`${API}/sessions?limit=10`);
  const sessions = await res.json();
  els.sessionBody.innerHTML = sessions.map(s => `
    <tr>
      <td>${s.topic_name}</td>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
      <td>${s.duration_minutes} min</td>
    </tr>
  `).join('');
}

async function loadWeeklyStats() {
  const res = await fetch(`${API}/stats/weekly`);
  const stats = await res.json();
  if (!stats.length) { els.chartContainer.style.display = 'none'; return; }
  
  els.chartContainer.style.display = 'block';
  if (els.weeklyChart) els.weeklyChart.destroy();
  
  els.weeklyChart = new Chart(document.getElementById('weeklyChart'), {
    type: 'bar',
    data: {
      labels: stats.map(s => s.topic),
      datasets: [{ label: 'Minutes (Last 7 Days)', data: stats.map(s => s.total_minutes), backgroundColor: '#2563eb' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// --- CSV Export (V2) ---
els.exportBtn.onclick = async () => {
  const res = await fetch(`${API}/sessions?limit=500`);
  const sessions = await res.json();
  let csv = 'Subject,Date,Duration(min)\n';
  sessions.forEach(s => {
    csv += `"${s.topic_name}","${new Date(s.created_at).toLocaleDateString()}",${s.duration_minutes}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'study_sessions.csv'; a.click();
};

init();