const ANSWERS_KEY = 'formfill_answers';
const MODE_KEY = 'formfill_mode';

const btnLearn = document.getElementById('btn-learn');
const btnFill = document.getElementById('btn-fill');
const fieldCount = document.getElementById('field-count');
const statusBar = document.getElementById('status-bar');
const editorPanel = document.getElementById('editor-panel');
const fieldList = document.getElementById('field-list');

function setStatus(msg, isError = false) {
  statusBar.textContent = msg;
  statusBar.style.color = isError ? '#f87171' : '#4ade80';
  setTimeout(() => { statusBar.textContent = ''; }, 3000);
}

async function getAnswers() {
  return new Promise(resolve => {
    chrome.storage.local.get(ANSWERS_KEY, r => resolve(r[ANSWERS_KEY] || {}));
  });
}

async function getMode() {
  return new Promise(resolve => {
    chrome.storage.local.get(MODE_KEY, r => resolve(r[MODE_KEY] || 'idle'));
  });
}

async function setMode(mode) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [MODE_KEY]: mode }, resolve);
  });
}

async function sendToContent(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ ...msg, target: 'content' }, res => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(res);
    });
  });
}

async function refreshUI() {
  const [answers, mode] = await Promise.all([getAnswers(), getMode()]);
  fieldCount.textContent = Object.keys(answers).length;

  btnLearn.classList.toggle('active', mode === 'learn');
  btnLearn.classList.toggle('learn', mode === 'learn');
  btnFill.classList.toggle('active', mode === 'fill');
}

// Mode buttons
btnLearn.addEventListener('click', async () => {
  const mode = await getMode();
  const next = mode === 'learn' ? 'idle' : 'learn';
  await setMode(next);
  await sendToContent({ action: 'setMode', mode: next });
  setStatus(next === 'learn' ? 'Learn mode ON' : 'Learn mode off');
  refreshUI();
});

btnFill.addEventListener('click', async () => {
  await sendToContent({ action: 'setMode', mode: 'fill' });
  const res = await sendToContent({ action: 'fill' });
  if (res) setStatus(`Filled ${res.filled} · Unmatched ${res.unmatched?.length ?? 0}`);
  else setStatus('Could not reach page', true);
});

// View / Edit
document.getElementById('btn-view').addEventListener('click', async () => {
  const answers = await getAnswers();
  fieldList.innerHTML = '';

  for (const [key, entry] of Object.entries(answers)) {
    const item = document.createElement('div');
    item.className = 'field-item';
    item.innerHTML = `
      <div class="fi-label">${entry.label} <span style="opacity:.5">[${entry.type}]</span></div>
      <div class="fi-value" data-key="${key}">${Array.isArray(entry.value) ? entry.value.join(', ') : entry.value}</div>
      <div class="fi-actions">
        <button class="fi-edit" data-key="${key}">Edit</button>
        <button class="fi-delete" data-key="${key}">Delete</button>
      </div>
    `;
    fieldList.appendChild(item);
  }

  if (!Object.keys(answers).length) {
    fieldList.innerHTML = '<p style="color:#94a3b8;font-size:12px">No fields learned yet.</p>';
  }

  editorPanel.classList.remove('hidden');
});

document.getElementById('btn-close-editor').addEventListener('click', () => {
  editorPanel.classList.add('hidden');
  refreshUI();
});

fieldList.addEventListener('click', async e => {
  const key = e.target.dataset.key;
  if (!key) return;

  if (e.target.classList.contains('fi-delete')) {
    const answers = await getAnswers();
    delete answers[key];
    await new Promise(r => chrome.storage.local.set({ [ANSWERS_KEY]: answers }, r));
    e.target.closest('.field-item').remove();
    refreshUI();
  }

  if (e.target.classList.contains('fi-edit')) {
    const valueEl = fieldList.querySelector(`.fi-value[data-key="${key}"]`);
    const current = valueEl.textContent;
    const newVal = prompt(`Edit value for "${key}":`, current);
    if (newVal !== null && newVal !== current) {
      const answers = await getAnswers();
      answers[key].value = newVal;
      await new Promise(r => chrome.storage.local.set({ [ANSWERS_KEY]: answers }, r));
      valueEl.textContent = newVal;
    }
  }
});

// Clear all
document.getElementById('btn-clear').addEventListener('click', async () => {
  if (!confirm('Delete all learned form data?')) return;
  await new Promise(r => chrome.storage.local.remove(ANSWERS_KEY, r));
  setStatus('All data cleared');
  refreshUI();
});

// Init
refreshUI();
