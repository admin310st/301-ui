/**
 * TDS (Traffic Distribution System) Entry Point
 *
 * NOTE: TDS page init is handled by src/main.ts (after auth is ready),
 * just like all other pages. This file is kept as the streams-specific
 * entry point but currently delegates to main.ts.
 *
 * If streams-specific initialization that doesn't need auth is needed
 * in the future, add it here.
 */

// All TDS initialization is handled by main.ts:
//   initTdsPage()  — page controller
//   initTdsDrawer() — drawer management
