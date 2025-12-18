const THEME_KEY = 'theme';
type Theme = 'dark' | 'light';

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function getTheme(): Theme {
  const root = document.documentElement;
  try {
    const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore
  }

  const explicit = root.dataset.theme as Theme | undefined;
  if (explicit === 'dark' || explicit === 'light') return explicit;

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function initTheme(): void {
  const theme = getTheme();
  setTheme(theme);

  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', (evt) => {
      const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
      if (!stored) {
        setTheme(evt.matches ? 'dark' : 'light');
      }
    });
  } catch {
    // ignore
  }
}

export function toggleTheme(): void {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export function initThemeToggle(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  if (buttons.length === 0) return;

  const updateIcon = () => {
    const theme = getTheme();
    root
      .querySelectorAll<HTMLElement>('[data-theme-icon]')
      .forEach((el) => {
        const mode = el.dataset.themeIcon;
        el.hidden = mode !== theme;
      });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleTheme();
      updateIcon();
    });
  });

  updateIcon();
}
