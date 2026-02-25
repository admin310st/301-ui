/**
 * TDS state management
 * Single source of truth for TDS/Streams page
 *
 * Account-scoped rules (not site-scoped like redirects).
 * Rules have domain bindings managed separately.
 */

import type { TdsRule, TdsPreset } from '@api/types';
import { getRules, getPresets } from '@api/tds';
import { safeCall } from '@api/ui-client';

// =============================================================================
// State Interface
// =============================================================================

export interface TdsState {
  rules: TdsRule[];
  presets: TdsPreset[];
  loading: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

// =============================================================================
// State Singleton
// =============================================================================

let state: TdsState = {
  rules: [],
  presets: [],
  loading: true,
  error: null,
  lastLoadedAt: null,
};

// =============================================================================
// Listeners (reactive updates)
// =============================================================================

type StateListener = (state: TdsState) => void;
const listeners: StateListener[] = [];

function notifyListeners(): void {
  listeners.forEach(fn => fn(state));
}

/**
 * Subscribe to state changes
 * @returns Unsubscribe function
 */
export function onStateChange(fn: StateListener): () => void {
  listeners.push(fn);
  fn(state);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Get current state (readonly snapshot)
 */
export function getState(): Readonly<TdsState> {
  return state;
}

// =============================================================================
// Actions (load data)
// =============================================================================

/**
 * Load TDS rules + presets
 */
export async function loadRules(): Promise<void> {
  state = { ...state, loading: true, error: null };
  notifyListeners();

  try {
    const [rulesResponse, presets] = await Promise.all([
      safeCall(() => getRules(), { lockKey: 'tds-rules', retryOn401: true }),
      safeCall(() => getPresets(), { lockKey: 'tds-presets', retryOn401: true }),
    ]);

    state = {
      ...state,
      rules: rulesResponse.rules,
      presets,
      loading: false,
      lastLoadedAt: Date.now(),
    };
    notifyListeners();
  } catch (error: any) {
    if (error.code === 'ABORTED') return;

    state = {
      ...state,
      loading: false,
      error: error.message || 'Failed to load TDS rules',
    };
    notifyListeners();
  }
}

/**
 * Force reload rules (skip cache)
 */
export async function refreshRules(): Promise<void> {
  state = { ...state, loading: true, error: null };
  notifyListeners();

  try {
    const rulesResponse = await safeCall(
      () => getRules(true),
      { lockKey: 'tds-rules-refresh', retryOn401: true }
    );

    state = {
      ...state,
      rules: rulesResponse.rules,
      loading: false,
      lastLoadedAt: Date.now(),
    };
    notifyListeners();
  } catch (error: any) {
    if (error.code === 'ABORTED') return;

    state = {
      ...state,
      loading: false,
      error: error.message || 'Failed to refresh TDS rules',
    };
    notifyListeners();
  }
}

// =============================================================================
// Optimistic Updates
// =============================================================================

/**
 * Add rule optimistically (after create)
 */
export function addRuleOptimistic(rule: TdsRule): void {
  state = {
    ...state,
    rules: [...state.rules, rule],
  };
  notifyListeners();
}

/**
 * Update rule optimistically (after edit)
 */
export function updateRuleOptimistic(id: number, updates: Partial<TdsRule>): void {
  state = {
    ...state,
    rules: state.rules.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ),
  };
  notifyListeners();
}

/**
 * Remove rule optimistically (after delete)
 */
export function removeRuleOptimistic(id: number): void {
  state = {
    ...state,
    rules: state.rules.filter(r => r.id !== id),
  };
  notifyListeners();
}

/**
 * Reorder rules optimistically (after drag or up/down)
 */
export function reorderRulesOptimistic(reordered: TdsRule[]): void {
  state = {
    ...state,
    rules: reordered,
  };
  notifyListeners();
}
