// Entry point: installs the mobile fullscreen handler and mounts the app into
// the #rod element.
import { setupFirstInteractionHandler, mountApp } from './ui/app.js';
import { setupPerfOverlay } from './perf-overlay.js';
setupFirstInteractionHandler();
mountApp(document.getElementById("rod"));
setupPerfOverlay();
