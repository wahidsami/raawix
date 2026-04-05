export const THEME_STORAGE_KEY = 'raawix-theme';

export type ThemeMode = 'light' | 'dark';

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyThemeClass(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
