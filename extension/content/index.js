// Content script entry point — injects FAB and handles mode transitions

(async () => {
  let currentMode = await Storage.getMode();

  // ── FAB injection ──────────────────────────────────────────────
  const fab = document.createElement('div');
  fab.id = 'formfill-fab';
  fab.innerHTML = `
    <div id="formfill-fab-icon">FF</div>
    <div id="formfill-fab-menu">
      <button id="ff-btn-learn">Learn Form</button>
      <button id="ff-btn-fill">Fill Form</button>
      <button id="ff-btn-snapshot">Save Answers</button>
      <div id="ff-status"></div>
    </div>
  `;
  document.body.appendChild(fab);

  const menu = document.getElementById('formfill-fab-menu');
  const icon = document.getElementById('formfill-fab-icon');
  const status = document.getElementById('ff-status');

  function setStatus(msg, isError = false) {
    status.textContent = msg;
    status.style.color = isError ? '#f87171' : '#4ade80';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }

  function updateFabState() {
    fab.dataset.mode = currentMode;
    icon.title = `FormFill — mode: ${currentMode}`;
  }
  updateFabState();

  // Toggle menu on icon click
  icon.addEventListener('click', () => {
    menu.classList.toggle('visible');
  });

  // Close menu when clicking outside
  document.addEventListener('click', e => {
    if (!fab.contains(e.target)) menu.classList.remove('visible');
  });

  // ── Learn mode ────────────────────────────────────────────────
  document.getElementById('ff-btn-learn').addEventListener('click', async () => {
    if (currentMode === 'learn') {
      currentMode = 'idle';
      await Storage.setMode('idle');
      Learner.stop();
      setStatus('Learn mode off');
    } else {
      currentMode = 'learn';
      await Storage.setMode('learn');
      Learner.start();
      setStatus('Learn mode ON — fill the form normally');
    }
    updateFabState();
    menu.classList.remove('visible');
  });

  // ── Save snapshot ─────────────────────────────────────────────
  document.getElementById('ff-btn-snapshot').addEventListener('click', async () => {
    const count = await Learner.snapshot();
    setStatus(`Saved ${count} field${count !== 1 ? 's' : ''}`);
    menu.classList.remove('visible');
  });

  // ── Fill mode ─────────────────────────────────────────────────
  document.getElementById('ff-btn-fill').addEventListener('click', async () => {
    menu.classList.remove('visible');
    const stats = await Filler.fillPage();
    setStatus(`Filled ${stats.filled} · Skipped ${stats.skipped} · Unmatched ${stats.unmatched.length}`);
    if (stats.unmatched.length > 0) {
      console.info('[FormFill] Unmatched fields:', stats.unmatched);
    }
  });

  // ── Listen for messages from popup ───────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'getMode') {
      sendResponse({ mode: currentMode });
    }
    if (msg.action === 'setMode') {
      currentMode = msg.mode;
      updateFabState();
      if (currentMode === 'learn') Learner.start();
      else Learner.stop();
      sendResponse({ ok: true });
    }
    if (msg.action === 'fill') {
      Filler.fillPage().then(stats => {
        setStatus(`Filled ${stats.filled} · Unmatched ${stats.unmatched.length}`);
        sendResponse(stats);
      });
    }
    return true;
  });
})();
