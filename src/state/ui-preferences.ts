/**
 * UI Preferences State
 * Persists user preferences across pages (selected project, view modes, etc.)
 */

const STORAGE_KEY = 'ui.preferences';

export interface SelectedProject {
  id: number;
  name: string;
}

export interface UIPreferences {
  /** Selected project for filtering (persists across Domains, Redirects, etc.) */
  selectedProject: SelectedProject | null;
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
export function getSelectedProject(): SelectedProject | null {
  return getUIPreferences().selectedProject;
}

/**
 * Get selected project name (for filters that use name)
 */
export function getSelectedProjectName(): string | null {
  return getUIPreferences().selectedProject?.name ?? null;
}

/**
 * Get selected project ID (for selectors that use ID)
 */
export function getSelectedProjectId(): number | null {
  return getUIPreferences().selectedProject?.id ?? null;
}

/**
 * Set selected project (null = "All" / no selection)
 */
export function setSelectedProject(project: SelectedProject | null): void {
  const prefs = getUIPreferences();
  prefs.selectedProject = project;
  saveUIPreferences(prefs);
}

/**
 * Clear selected project
 */
export function clearSelectedProject(): void {
  setSelectedProject(null);
}
