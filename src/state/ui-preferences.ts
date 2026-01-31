/**
 * UI Preferences State
 * Persists user preferences across pages (selected project, view modes, etc.)
 */

const STORAGE_KEY = 'ui.preferences';

export interface UIPreferences {
  /** Selected project name for filtering (persists across Domains, Redirects, etc.) */
  selectedProject: string | null;
}

const defaults: UIPreferences = {
  selectedProject: null,
};

/**
 * Get all UI preferences
 */
export function getUIPreferences(): UIPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load UI preferences:', e);
  }
  return { ...defaults };
}

/**
 * Save UI preferences
 */
function saveUIPreferences(prefs: UIPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save UI preferences:', e);
  }
}

/**
 * Get selected project
 */
export function getSelectedProject(): string | null {
  return getUIPreferences().selectedProject;
}

/**
 * Set selected project (null = "All")
 */
export function setSelectedProject(projectName: string | null): void {
  const prefs = getUIPreferences();
  prefs.selectedProject = projectName === 'all' ? null : projectName;
  saveUIPreferences(prefs);
}
