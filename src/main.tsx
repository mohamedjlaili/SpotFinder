/**
 * @file main.tsx
 * @description Frontend entry point. Mounts the root React component (App)
 * into the HTML DOM container under the 'root' identifier.
 */

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
// Global styles including tailwind and font overrides
import "./styles/index.css";

// Retrieve the 'root' DOM element, initialize the React root, and render the application tree
createRoot(document.getElementById("root")!).render(<App />);

  