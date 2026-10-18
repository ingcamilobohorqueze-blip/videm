/**
 * VIDEM Theme Controller
 * Manages Dark (Obsidian Cinema) & Light (Pure Studio) themes with localStorage persistence.
 */
(function initTheme() {
  const STORAGE_KEY = 'videm_theme';
  const root = document.documentElement;

  // Retrieve saved theme or system preference
  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Default to dark for cinema immersion, or match system if explicitly light
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches 
      ? 'light' 
      : 'dark';
  }

  // Apply theme to document element
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcons(theme);
  }

  // Update theme toggle button visual state
  function updateToggleIcons(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('title', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
      
      const sunIcon = btn.querySelector('.icon-sun');
      const moonIcon = btn.querySelector('.icon-moon');
      
      if (sunIcon && moonIcon) {
        if (isDark) {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      }
    });
  }

  // Immediate execution before DOM render to prevent flash of wrong theme
  const initialTheme = getPreferredTheme();
  root.setAttribute('data-theme', initialTheme);

  // Setup event listeners after DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    updateToggleIcons(initialTheme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    });

    // Listen to OS system preference changes if user hasn't explicitly set one
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  });
})();
