(function () {
  const STORAGE_KEY = 'sgd-theme';
  const THEMES = {
    dark: {
      bg: '#080c10',
      surface: '#0d1318',
      surfaceHi: '#121b22',
      border: '#1c2830',
      teal: '#2ab8a0',
      laps: '#4ab090',
      gold: '#c8a040',
      rose: '#b86858',
      steel: '#5890c8',
      lux: '#d4b038',
      fg1: '#ccd8d4',
      fg2: '#506870',
      fg3: '#2a3c44',
      heatLevels: ['#161e24', '#0a3d2e', '#0a6647', '#0d9668', '#2ab8a0', '#55e8c4'],
    },
    light: {
      bg: '#f2f6f5',
      surface: '#ffffff',
      surfaceHi: '#eaf2f0',
      border: '#d0dedd',
      teal: '#1a8a76',
      laps: '#1a7a64',
      gold: '#9a7820',
      rose: '#904840',
      steel: '#3860a8',
      lux: '#a08020',
      fg1: '#0e2028',
      fg2: '#507080',
      fg3: '#a8bcc0',
      heatLevels: ['#eaf2f0', '#b2ddd4', '#6bbfae', '#2a9e88', '#177a68', '#0e5a4a'],
    },
  };

  let currentTheme = 'dark';
  let initialized = false;
  const listeners = new Set();

  function validTheme(theme) {
    return theme === 'dark' || theme === 'light';
  }

  function savedTheme() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return validTheme(saved) ? saved : null;
    } catch (err) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function notify() {
    const tokens = THEMES[currentTheme];
    listeners.forEach(callback => callback(tokens));
  }

  function applyTheme(theme, persist, fire) {
    currentTheme = validTheme(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, currentTheme);
      } catch (err) {
      }
    }

    if (fire) notify();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    applyTheme(savedTheme() || systemTheme(), false, false);

    if (window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const onSystemChange = event => {
        if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light', false, true);
      };

      if (media.addEventListener) {
        media.addEventListener('change', onSystemChange);
      } else if (media.addListener) {
        media.addListener(onSystemChange);
      }
    }
  }

  window.Theme = {
    init,
    current() {
      return currentTheme;
    },
    set(theme) {
      applyTheme(theme, true, true);
    },
    toggle() {
      this.set(currentTheme === 'dark' ? 'light' : 'dark');
    },
    getTokens() {
      return THEMES[currentTheme];
    },
    onChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
})();
