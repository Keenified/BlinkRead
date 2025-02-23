let settings = {
  wpm: 300,
  theme: 'auto', // Change default theme to 'auto'
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

let words = [];
let currentIndex = 0;
let isPlaying = false;

// Load text from URL parameters (for context menu functionality)
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const text = urlParams.get("text");

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
  }
});

function applySettings() {
  if (settings.theme === 'auto') {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    settings.theme = isDarkMode ? 'dark' : 'light';
  }

  document.body.setAttribute('data-theme', settings.theme);
  document.documentElement.style.setProperty('--accent', settings.highlightColor);
  document.documentElement.style.setProperty('--bg-custom', settings.backgroundColor);
  document.documentElement.style.setProperty('--text-custom', settings.textColor);
  document.documentElement.style.setProperty('--letter-spacing', settings.letterSpacing + 'px');
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');

  // Apply dark mode text color if theme is dark
  if (settings.theme === 'dark') {
    document.documentElement.style.setProperty('--text-custom', getComputedStyle(document.documentElement).getPropertyValue('--dark-text-color'));
  }
}

function updateUI() {
  Object.keys(settings).forEach(key => {
    const element = document.getElementById(key);
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = settings[key];
      } else {
        element.value = settings[key];
      }
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
    case 'random':
    default:
      return Math.floor(Math.random() * word.length);
  }
}

function displayWord() {
  if (currentIndex >= words.length) {
    isPlaying = false;
    updatePlayPauseButton();
    return;
  }

  const contextBefore = document.getElementById('contextBefore');
  const contextAfter = document.getElementById('contextAfter');

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
  const wordElement = document.getElementById('word');
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

  if (settings.focusMode) {
    baseDelay *= 1.5;
    if (/[.!?]$/.test(word)) {
      baseDelay *= 2;
    }
  }

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
    if (!isPlaying) return;

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

// Settings panel toggle
document.getElementById('settingsToggle').addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.toggle('visible');
});

// Apply dark mode theme correctly
function applyTheme() {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('.reader-content').style.color = isDarkMode ? '#FFFFFF' : '#000000';
}

document.addEventListener('DOMContentLoaded', applyTheme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
