import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { APP_VERSION, VERSION_KEY } from './constants/version'

// Version checking and storage clearing logic
const checkAndClearStorage = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  // If version doesn't exist or doesn't match, clear storage and reload
  if (storedVersion !== APP_VERSION) {
    console.log(`Version mismatch or missing. Clearing storage. Stored: ${storedVersion}, Current: ${APP_VERSION}`);
    
    // Clear all localStorage
    localStorage.clear();
    
    // Clear IndexedDB if it exists
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
    
    // Set the new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    
    // Reload the page to ensure clean state
    window.location.reload();
    return false; // Indicate that we're reloading
  }
  
  return true; // Indicate that we can proceed
};

// Check version before rendering
if (checkAndClearStorage()) {
  createRoot(document.getElementById("root")!).render(<App />);
}
