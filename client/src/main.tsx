import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection caught and suppressed:', event.reason);
  event.preventDefault(); // Prevent the default browser behavior
});

// Global error handler for other errors
window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
