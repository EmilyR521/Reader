import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Apply theme immediately before Angular bootstraps to prevent flash of unstyled content
function applyInitialTheme(): void {
  const STORAGE_KEY = 'theme';
  const DEFAULT_THEME = 'minimal-light';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  let theme: string;
  
  if (stored === 'bookish-light' || stored === 'bookish-dark' || 
      stored === 'minimal-light' || stored === 'minimal-dark') {
    theme = stored;
  } else if (stored === 'light' || stored === 'dark') {
    // Migrate old theme names
    theme = stored === 'dark' ? 'minimal-dark' : 'minimal-light';
    localStorage.setItem(STORAGE_KEY, theme);
  } else {
    // No stored theme - use default
    theme = DEFAULT_THEME;
    localStorage.setItem(STORAGE_KEY, theme);
  }
  
  // Apply theme class to html element immediately
  const htmlElement = document.documentElement;
  htmlElement.classList.remove('bookish-light', 'bookish-dark', 'minimal-light', 'minimal-dark');
  htmlElement.classList.add(theme);
}

// Apply theme before Angular bootstraps
applyInitialTheme();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
