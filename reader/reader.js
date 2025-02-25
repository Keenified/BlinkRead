let settings = {
  wpm: 300,
  theme: 'auto',
  highlightColor: '#9300ff',
  backgroundColor: '',
  textColor: '#ffffff',
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

let words = [];
let currentIndex = 0;
let isPlaying = false;
let isPaused = false;

// Load text from URL parameters (for context menu functionality)
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const text = urlParams.get("text");

  // Add close button
  const closeButton = document.createElement('button');
  closeButton.id = 'closeTab';
  closeButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `;
  closeButton.addEventListener('click', () => window.close());
  document.querySelector('.controls').appendChild(closeButton);

  if (text) {
    words = decodeURIComponent(text).split(/\s+/).filter(word => word.length > 0);
    applySettings();
    
    updateUI();
    displayWord();

    if (settings.autoReadDelay > 0) {
      setTimeout(() => {
        startReading();
      }, settings.autoReadDelay * 1000);
    }
  }

  // Listen for system color scheme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    applySettings();
  });

  // Close settings panel when clicking outside of it
  document.addEventListener('click', (event) => {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsToggle = document.getElementById('settingsToggle');
    if (settingsPanel.classList.contains('visible') && !settingsPanel.contains(event.target) && !settingsToggle.contains(event.target)) {
      settingsPanel.classList.remove('visible');
    }
  });
});

// Initialize reader with text from popup or context menu
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'setText') {
    words = message.text.split(/\s+/).filter(word => word.length > 0);
    settings = { ...settings, ...message.settings };
    applySettings();
    updateUI();
    displayWord();

    if (settings.autoReadDelay > 0) {
      setTimeout(() => {
        startReading();
      }, settings.autoReadDelay * 1000);
    }
  } else if (message.type === 'settingsUpdated') {
    settings = { ...settings, ...message.settings };
    applySettings();
    updateUI();
    displayWord();
  }
});

function applySettings() {
  // Handle theme
  const theme = settings.theme === 'auto' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : settings.theme;
  
  document.body.setAttribute('data-theme', theme);
  
  // Apply colors and styles
  document.documentElement.style.setProperty('--accent', settings.highlightColor);
  document.documentElement.style.setProperty('--bg-custom', settings.backgroundColor || (theme === 'dark' ? '#202023' : '#ffffff'));
  document.documentElement.style.setProperty('--text-custom', settings.textColor);
  document.documentElement.style.setProperty('--letter-spacing', settings.letterSpacing + 'px');
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');

  // Apply dark mode text color if needed
  if (theme === 'dark') {
    document.documentElement.style.setProperty('--text-custom', getComputedStyle(document.documentElement).getPropertyValue('--dark-text-color'));
  }

  // Apply background color to reader
  document.querySelector('.reader').style.backgroundColor = settings.backgroundColor || (theme === 'dark' ? '#202023' : '#ffffff');
  // Apply text color to speed text
  document.querySelector('#word').style.color = settings.textColor;

  // Update accent color for both themes
  document.querySelector(':root').style.setProperty('--accent', settings.highlightColor);
  document.querySelector('[data-theme="light"]').style.setProperty('--accent', settings.highlightColor);
  document.querySelector('[data-theme="dark"]').style.setProperty('--accent', settings.highlightColor);

  // Display the current word
  displayWord();
}

function updateUI() {
  Object.entries(settings).forEach(([key, value]) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'checkbox') {
      element.checked = value;
    } else {
      element.value = value;
    }
  });
  updateWPMDisplay();
}

function getHighlightIndex(word) {
  switch (settings.highlightMode) {
    case 'first':
      return 0;
    case 'middle':
      return Math.floor(word.length / 2);
    case 'last':
      return word.length - 1;  
    case 'random':
    default:
      return Math.floor(Math.random() * word.length);
  }
}

function displayWord() {
  if (currentIndex >= words.length) {
    isPlaying = false;
    updatePlayPauseButton();
    if (settings.autoExit) {
      window.close();
    }
    return;
  }

  const contextBefore = document.getElementById('contextBefore');
  const contextAfter = document.getElementById('contextAfter');
  const wordElement = document.getElementById('word');

  // Show context words when paused
  if (!isPlaying) {
    const beforeWords = words.slice(Math.max(0, currentIndex - settings.contextWords), currentIndex).join(' ');
    const afterWords = words.slice(currentIndex + settings.wordsPerView, currentIndex + settings.wordsPerView + settings.contextWords).join(' ');

    contextBefore.textContent = beforeWords;
    contextAfter.textContent = afterWords;
  } else {
    contextBefore.textContent = '';
    contextAfter.textContent = '';
  }
 
  // Display current words
  wordElement.innerHTML = '';
  for (let i = 0; i < settings.wordsPerView && currentIndex + i < words.length; i++) {
    const word = words[currentIndex + i];
    const letterIndex = getHighlightIndex(word);

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.innerHTML = word.split('').map((letter, index) =>
      index === letterIndex ?
        `<span class="highlight">${letter}</span>` :
        letter
    ).join('');

    if (settings.pauseOnHover) {
      wordSpan.addEventListener('mouseenter', () => {
        isPaused = true;
        wordElement.classList.add('paused');
      });
      wordSpan.addEventListener('mouseleave', () => {
        isPaused = false;
        wordElement.classList.remove('paused');
      });
    }

    wordElement.appendChild(wordSpan);

    if (i < settings.wordsPerView - 1 && currentIndex + i + 1 < words.length) {
      wordElement.appendChild(document.createTextNode(' '));
    }
  }

  updateProgress();
}

function updateProgress() {
  const progress = (currentIndex / (words.length - 1)) * 100;
  document.getElementById('progress').value = progress;
}

function updateWPMDisplay() {
  document.getElementById('wpmDisplay').textContent = `${settings.wpm} WPM`;
}

function getWordDelay(word) {
  let baseDelay = 60000 / settings.wpm;

  // Apply focus mode reduction
  if (settings.focusMode) {
    baseDelay *= 1.3; // 30% slower
  }

  // Apply long word delay
  if (word.length >= settings.longWordThreshold) {
    baseDelay *= (1 + settings.longWordDelay / 100);
  }

  return baseDelay;
}

function startReading() {
  if (currentIndex >= words.length) currentIndex = 0;
  isPlaying = true;
  updatePlayPauseButton();
  displayWord();

  function showNextWord() {
    if (!isPlaying || isPaused) {
      if (isPlaying) {
        setTimeout(showNextWord, 100); // Check again in 100ms if paused
        return;
      }
      return;
    }

    displayWord();
    currentIndex += settings.wordsPerView;

    if (currentIndex < words.length) {
      setTimeout(showNextWord, getWordDelay(words[currentIndex]));
    } else {
      isPlaying = false;
      updatePlayPauseButton();
      displayWord();
    }
  }

  showNextWord();
}

function pauseReading() {
  isPlaying = false;
  updatePlayPauseButton();
  displayWord();
}

function toggleReading() {
  isPlaying ? pauseReading() : startReading();
}

function updatePlayPauseButton() {
  document.getElementById('playIcon').style.display = isPlaying ? 'none' : 'block';
  document.getElementById('pauseIcon').style.display = isPlaying ? 'block' : 'none';
}

function saveSettings() {
  browser.storage.local.set({ settings });
  // Notify popup about settings change
  browser.runtime.sendMessage({
    type: 'settingsUpdated',
    settings
  });
}

// Event Listeners
document.getElementById('playPause').addEventListener('click', toggleReading);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    toggleReading();
  }
});

document.getElementById('progress').addEventListener('input', (e) => {
  currentIndex = Math.floor((e.target.value / 100) * (words.length - 1));
  displayWord();
});

// WPM controls
document.getElementById('decreaseWPM').addEventListener('click', () => {
  settings.wpm = Math.max(1, settings.wpm - 50);
  updateWPMDisplay();
  saveSettings();
});

document.getElementById('increaseWPM').addEventListener('click', () => {
  settings.wpm = Math.min(1000, settings.wpm + 50);
  updateWPMDisplay();
  saveSettings();
});

// Settings panel toggle
document.getElementById('settingsToggle').addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.toggle('visible');
  displayWord(); // Ensure the word is displayed when the settings panel is toggled
});

// Settings event listeners
['wordsPerView', 'contextWords', 'autoReadDelay', 'longWordThreshold', 'longWordDelay'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = parseInt(e.target.value);
    saveSettings();
    displayWord(); // Refresh display for immediate effect
  });
});

['letterSpacing', 'fontSize'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('input', (e) => {
    settings[setting] = parseInt(e.target.value);
    applySettings();
    saveSettings();
  });
});

['highlightColor', 'backgroundColor', 'textColor'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.value;
    applySettings();
    saveSettings();
  });
});

['pauseOnHover', 'focusMode', 'autoExit'].forEach(setting => {
  document.getElementById(setting)?.addEventListener('change', (e) => {
    settings[setting] = e.target.checked;
    saveSettings();
    if (setting === 'pauseOnHover') {
      displayWord(); // Refresh display to add/remove hover listeners
    }
  });
});

document.getElementById('highlightMode')?.addEventListener('change', (e) => {
  settings.highlightMode = e.target.value;
  saveSettings();
  displayWord(); // Refresh display for immediate effect
});