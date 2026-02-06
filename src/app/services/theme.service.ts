import { Injectable } from '@angular/core';
import { Theme } from '../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';
  private currentTheme: Theme = 'bookish-light';

  constructor() {
    this.loadTheme();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  isDarkMode(): boolean {
    return this.currentTheme === 'bookish-dark' || this.currentTheme === 'minimal-dark';
  }

  toggleTheme(): void {
    // Toggle between light and dark variants of the same style
    if (this.currentTheme === 'bookish-light') {
      this.currentTheme = 'bookish-dark';
    } else if (this.currentTheme === 'bookish-dark') {
      this.currentTheme = 'bookish-light';
    } else if (this.currentTheme === 'minimal-light') {
      this.currentTheme = 'minimal-dark';
    } else if (this.currentTheme === 'minimal-dark') {
      this.currentTheme = 'minimal-light';
    }
    this.applyTheme();
    this.saveTheme();
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.applyTheme();
    this.saveTheme();
  }

  private loadTheme(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'bookish-light' || stored === 'bookish-dark' || 
        stored === 'minimal-light' || stored === 'minimal-dark') {
      this.currentTheme = stored as Theme;
    } else if (stored === 'light' || stored === 'dark') {
      // Migrate old theme names
      this.currentTheme = stored === 'dark' ? 'bookish-dark' : 'bookish-light';
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'bookish-dark';
      }
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    const htmlElement = document.documentElement;
    // Remove all theme classes
    htmlElement.classList.remove('bookish-light', 'bookish-dark', 'minimal-light', 'minimal-dark');
    // Add current theme class
    htmlElement.classList.add(this.currentTheme);
  }

  private saveTheme(): void {
    localStorage.setItem(this.STORAGE_KEY, this.currentTheme);
  }
}
