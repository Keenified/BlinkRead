const defaultSettings = {
  fontSize: 24,
  font: 'system-ui',
  letterSpacing: 0,
  wordsAtOnce: 1,
  autoReadDelay: 0,
  highlightStyle: 'random',
  highlightColor: '',
  backgroundColor: 'data-theme= match',
  textColor: ''
};

async function initializeSettings() {
  const storedSettings = await browser.storage.local.get('settings');
  if (!storedSettings.settings) {
    await browser.storage.local.set({ settings: defaultSettings });
  }
}

async function getSettings() {
  const storedSettings = await browser.storage.local.get('settings');
  return { ...defaultSettings, ...storedSettings.settings };
}

function saveSetting(key, value) {
  browser.storage.local.get('settings').then(storedSettings => {
    const settings = { ...storedSettings.settings, [key]: value };
    browser.storage.local.set({ settings });
    // Notify other parts of the extension about the settings change
    browser.runtime.sendMessage({ type: 'settingsUpdated', settings });
  });
}

function applySettingsToUI(settings) {
  Object.entries(settings).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'range') {
      element.value = value;
      element.nextElementSibling.textContent = getValueWithUnit(key, value);
    } else {
      element.value = value;
    }
  });
}

function getValueWithUnit(key, value) {
  switch (key) {
    case 'fontSize':
      return `${value}px`;
    case 'letterSpacing':
      return `${value}px`;
    case 'autoReadDelay':
      return `${value}s`;
    default:
      return value;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initializeSettings();
  const settings = await getSettings();
  applySettingsToUI(settings);

  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', (e) => {
      const value = e.target.type === 'range' ? parseInt(e.target.value) : e.target.value;
      if (e.target.type === 'range') {
        e.target.nextElementSibling.textContent = getValueWithUnit(e.target.id, value);
      }
      saveSetting(e.target.id, value);
    });
  });
});
