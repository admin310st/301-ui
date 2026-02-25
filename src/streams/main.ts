/**
 * TDS (Traffic Distribution System) Main Entry Point
 * Initializes the TDS page controller on DOMContentLoaded
 */

import { initTdsPage } from './tds-page';
import { initDrawer } from './drawer';

document.addEventListener('DOMContentLoaded', () => {
  initTdsPage();
  initDrawer();
});
