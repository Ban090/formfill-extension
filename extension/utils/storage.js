const Storage = (() => {
  const ANSWERS_KEY = 'formfill_answers';
  const MODE_KEY = 'formfill_mode';

  async function getAnswers() {
    return new Promise(resolve => {
      chrome.storage.local.get(ANSWERS_KEY, result => {
        resolve(result[ANSWERS_KEY] || {});
      });
    });
  }

  async function saveAnswer(fieldKey, entry) {
    const answers = await getAnswers();
    answers[fieldKey] = { ...answers[fieldKey], ...entry, updatedAt: Date.now() };
    return new Promise(resolve => {
      chrome.storage.local.set({ [ANSWERS_KEY]: answers }, resolve);
    });
  }

  async function removeAnswer(fieldKey) {
    const answers = await getAnswers();
    delete answers[fieldKey];
    return new Promise(resolve => {
      chrome.storage.local.set({ [ANSWERS_KEY]: answers }, resolve);
    });
  }

  async function clearAnswers() {
    return new Promise(resolve => {
      chrome.storage.local.remove(ANSWERS_KEY, resolve);
    });
  }

  async function getMode() {
    return new Promise(resolve => {
      chrome.storage.local.get(MODE_KEY, result => {
        resolve(result[MODE_KEY] || 'idle'); // 'idle' | 'learn' | 'fill'
      });
    });
  }

  async function setMode(mode) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [MODE_KEY]: mode }, resolve);
    });
  }

  return { getAnswers, saveAnswer, removeAnswer, clearAnswers, getMode, setMode };
})();
