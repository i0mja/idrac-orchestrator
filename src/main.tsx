/**
 * @fileoverview Application entry point for iDRAC Updater Orchestrator
 * 
 * This is the main entry point for the React application. It initializes
 * the React application and mounts it to the DOM.
 * 
 * @author Enterprise Infrastructure Team
 * @version 1.0.0
 */

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

/**
 * Initialize and render the React application
 * 
 * Creates the React root and renders the main App component.
 * Uses React 18's createRoot API for concurrent features.
 */
createRoot(document.getElementById("root")!).render(<App />);
