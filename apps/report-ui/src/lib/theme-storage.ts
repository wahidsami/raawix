export const THEME_STORAGE_KEY = 'raawix-theme';

export type ThemeMode = 'light' | 'dark';

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyThemeClass(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
