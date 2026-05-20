// Background service worker — handles extension install and cross-tab state

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ formfill_mode: 'idle' });
});

// Forward popup → content-script messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]) return sendResponse({ error: 'no active tab' });
      chrome.tabs.sendMessage(tabs[0].id, msg, sendResponse);
    });
    return true;
  }
});
