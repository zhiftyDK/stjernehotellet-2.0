import { createRoot as createRoot_ } from 'react-dom/client';
import * as J from 'react/jsx-runtime';
import React from 'react';
import { setupFirstInteractionHandler, App } from './ui/app.js';
setupFirstInteractionHandler();
createRoot_(document.getElementById("rod")).render(J.jsx(React.StrictMode, { children: J.jsx(App, {}) }));
