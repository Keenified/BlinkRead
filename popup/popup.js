let settings = {
  wpm: 300,
  theme: 'auto',
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
  highlightMode: 'random',
  autoExit: false
};

// Load saved settings
browser.storage.local.get('settings').then(result => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
    updateUI();
  }
});

// Listen for settings changes from reader
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'settingsUpdated') {
    settings = { ...settings, ...message.settings };
    updateUI();
  }
});

function updateUI() {
  // Update theme
  const theme = settings.theme === 'auto' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme;
  
  document.body.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').setAttribute('data-theme', theme);
  
  // Update theme icon
  const themeIcon = document.getElementById('themeToggle').querySelector('svg');
  if (theme === 'dark') {
    themeIcon.innerHTML = `<circle cx="12" cy="12" r="10"/><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`;
  } else {
    themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`;
  }

  // Update all settings inputs
  Object.entries(settings).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'checkbox') {
      element.checked = value;
    } else {
      element.value = value;
    }
  });

  // Update WPM display
  document.getElementById('wpm').value = settings.wpm;
  document.getElementById('wpmInput').value = settings.wpm;
  document.getElementById('wpmDisplay').textContent = `${settings.wpm} WPM`;

  // Apply colors
  document.documentElement.style.setProperty('--accent', settings.highlightColor);
  document.documentElement.style.setProperty('--bg-custom', settings.backgroundColor || (theme === 'dark' ? '#202023' : '#ffffff'));
  document.documentElement.style.setProperty('--text-custom', settings.textColor);

  // Apply background color to reader
  document.querySelector('.reader').style.backgroundColor = settings.backgroundColor || (theme === 'dark' ? '#202023' : '#ffffff');
  // Apply text color to speed text
  document.querySelector('#word').style.color = settings.textColor;

  // Update accent color for both themes
  document.querySelector(':root').style.setProperty('--accent', settings.highlightColor);
  document.querySelector('[data-theme="light"]').style.setProperty('--accent', settings.highlightColor);
  document.querySelector('[data-theme="dark"]').style.setProperty('--accent', settings.highlightColor);
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  const currentTheme = settings.theme;
  if (currentTheme === 'auto') {
    settings.theme = 'light';
  } else if (currentTheme === 'light') {
    settings.theme = 'dark';
  } else {
    settings.theme = 'auto';
  }
  saveSettings();
  updateUI();
});

// WPM slider and input
document.getElementById('wpm').addEventListener('input', (e) => {
  settings.wpm = parseInt(e.target.value);
  document.getElementById('wpmInput').value = settings.wpm;
  document.getElementById('wpmDisplay').textContent = `${settings.wpm} WPM`;
  saveSettings();
});

document.getElementById('wpmInput').addEventListener('change', (e) => {
  settings.wpm = parseInt(e.target.value);
  document.getElementById('wpm').value = settings.wpm;
  document.getElementById('wpmDisplay').textContent = `${settings.wpm} WPM`;
  saveSettings();
});

// Advanced settings toggle
document.getElementById('advancedSettings').addEventListener('click', () => {
  const panel = document.getElementById('advancedSettingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Close settings panel when clicking outside of it
document.addEventListener('click', (event) => {
  const panel = document.getElementById('advancedSettingsPanel');
  const toggleButton = document.getElementById('advancedSettings');
  if (panel.style.display === 'block' && !panel.contains(event.target) && !toggleButton.contains(event.target)) {
    panel.style.display = 'none';
  }
});

// Settings event listeners
['wordsPerView', 'contextWords', 'autoReadDelay', 'longWordThreshold', 'longWordDelay'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = parseInt(e.target.value);
    saveSettings();
  });
});

['letterSpacing', 'fontSize'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('input', (e) => {
    settings[setting] = parseInt(e.target.value);
    if (setting === 'letterSpacing') {
      document.getElementById('letterSpacingDisplay').textContent = `${settings[setting]}px`;
    }
    saveSettings();
  });
});

['highlightColor', 'backgroundColor', 'textColor'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.value;
    saveSettings();
    updateUI();
  });
});

['pauseOnHover', 'focusMode', 'autoExit'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.checked;
    saveSettings();
  });
});

document.getElementById('highlightMode')?.addEventListener('change', (e) => {
  settings.highlightMode = e.target.value;
  saveSettings();
});

async function saveSettings() {
  // First, save to storage
  await browser.storage.local.set({ settings });

  try {
    // Get all tabs
    const tabs = await browser.tabs.query({});
    
    // Find reader tabs and notify them
    const readerTabs = tabs.filter(tab => tab.url && tab.url.includes('reader.html'));
    
    // Send message to each reader tab
    const messagePromises = readerTabs.map(tab => 
      browser.tabs.sendMessage(tab.id, {
        type: 'settingsUpdated',
        settings
      }).catch(err => {
        // Ignore errors from closed or unresponsive tabs
        console.log(`Failed to update tab ${tab.id}:`, err);
      })
    );

    // Wait for all messages to be sent
    await Promise.all(messagePromises);
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

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
        window.close();
      }
    });
  });
});