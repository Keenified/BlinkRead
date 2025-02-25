document.addEventListener('DOMContentLoaded', async () => {
  const settings = await browser.storage.local.get('settings');
  const defaultSettings = {
    fontSize: 24,
    font: 'system-ui',
    letterSpacing: 0,
    wordsAtOnce: 1,
    autoReadDelay: 0,
    highlightStyle: 'random',
    highlightColor: '#f97316',
    backgroundColor: '',
    textColor: ''
  };

  const currentSettings = { ...defaultSettings, ...settings.settings };

  // Initialize all inputs with current values
  Object.entries(currentSettings).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'range') {
      element.value = value;
      element.nextElementSibling.textContent = getValueWithUnit(key, value);
    } else {
      element.value = value;
    }
  });

  // Add event listeners to all inputs
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', async (e) => {
      const value = e.target.type === 'range' ? parseInt(e.target.value) : e.target.value;
      
      // Update value display for range inputs
      if (e.target.type === 'range') {
        e.target.nextElementSibling.textContent = getValueWithUnit(e.target.id, value);
      }

      // Save to storage
      const settings = await browser.storage.local.get('settings');
      const updatedSettings = {
        ...settings.settings,
        [e.target.id]: value
      };
      
      await browser.storage.local.set({ settings: updatedSettings });
    });
  });
});

function getValueWithUnit(key, value) {
  switch (key) {
    case 'fontSize':
      return `${value}px`;
    case 'letterSpacing':
      return `${value}px`;
    case 'wordsAtOnce':
      return value;
    case 'autoReadDelay':
      return `${value}s`;
    default:
      return value;
  }
}