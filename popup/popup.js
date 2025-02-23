let settings = {
  wpm: 300,
  theme: 'light',
  highlightColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  longWordThreshold: 8,
  longWordDelay: 30,
  wordsPerView: 1,
  autoReadDelay: 0,
  letterSpacing: 0,
  fontSize: 64,
  contextWords: 3,
  pauseOnHover: false,
  focusMode: false,
  highlightMode: 'random'
};

// Load saved settings
browser.storage.local.get('settings').then(result => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
    updateUI();
  }
});

function updateUI() {
  document.body.setAttribute('data-theme', settings.theme);
  document.getElementById('themeToggle').setAttribute('data-theme', settings.theme);
  document.getElementById('themeIcon').src = settings.theme === 'light' ? 'icons/light_mode.svg' : 'icons/dark_mode.svg';
  document.getElementById('themeIcon').src = settings.theme === 'light' ? 'icons/openicon.svg' : 'icons/closeicon.svg';
  document.getElementById('wpm').value = settings.wpm;
  document.getElementById('wpmInput').value = settings.wpm;
  document.getElementById('wordsPerView').value = settings.wordsPerView;
  document.getElementById('contextWords').value = settings.contextWords;
  document.getElementById('autoReadDelay').value = settings.autoReadDelay;
  document.getElementById('letterSpacing').value = settings.letterSpacing;
  document.getElementById('letterSpacingDisplay').textContent = `${settings.letterSpacing}px`;
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('longWordThreshold').value = settings.longWordThreshold;
  document.getElementById('longWordDelay').value = settings.longWordDelay;
  document.getElementById('highlightColor').value = settings.highlightColor;
  document.getElementById('backgroundColor').value = settings.backgroundColor;
  document.getElementById('textColor').value = settings.textColor;
  document.getElementById('pauseOnHover').checked = settings.pauseOnHover;
  document.getElementById('focusMode').checked = settings.focusMode;
  document.getElementById('highlightMode').value = settings.highlightMode;
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  settings.theme = settings.theme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', settings.theme);
  document.getElementById('themeToggle').setAttribute('data-theme', settings.theme);
  document.getElementById('themeIcon').src = settings.theme === 'light' ? 'icons/light_mode.svg' : 'icons/dark_mode.svg';
  document.getElementById('themeIcon').src = settings.theme === 'light' ? 'icons/openicon.svg' : 'icons/closeicon.svg';
  browser.storage.local.set({ settings });
  updateUI();
});

// WPM slider and input
document.getElementById('wpm').addEventListener('input', (e) => {
  settings.wpm = parseInt(e.target.value);
  document.getElementById('wpmInput').value = settings.wpm;
  browser.storage.local.set({ settings });
});

document.getElementById('wpmInput').addEventListener('change', (e) => {
  settings.wpm = parseInt(e.target.value);
  document.getElementById('wpm').value = settings.wpm;
  browser.storage.local.set({ settings });
});

// Advanced settings toggle
document.getElementById('advancedSettings').addEventListener('click', () => {
  const panel = document.getElementById('advancedSettingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Settings event listeners
['wordsPerView', 'contextWords', 'autoReadDelay', 'longWordThreshold', 'longWordDelay'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = parseInt(e.target.value);
    browser.storage.local.set({ settings });
  });
});

['letterSpacing', 'fontSize'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('input', (e) => {
    settings[setting] = parseInt(e.target.value);
    if (setting === 'letterSpacing') {
      document.getElementById('letterSpacingDisplay').textContent = `${settings[setting]}px`;
    }
    browser.storage.local.set({ settings });
  });
});

['highlightColor', 'backgroundColor', 'textColor'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.value;
    browser.storage.local.set({ settings });
  });
});

['pauseOnHover', 'focusMode'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.checked;
    browser.storage.local.set({ settings });
  });
});

document.getElementById('highlightMode')?.addEventListener('change', (e) => {
  settings.highlightMode = e.target.value;
  browser.storage.local.set({ settings });
});

// Start reading button
document.getElementById('startReading').addEventListener('click', () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;

  browser.tabs.create({
    url: '/reader/reader.html'
  }).then(tab => {
    browser.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        browser.tabs.sendMessage(tab.id, {
          type: 'setText',
          text,
          settings
        });
        window.close(); // Close the popup UI
      }
    });
  });
});