import { editor } from './editor.js';
import { ui } from './ui.js';
import { initializeEventListeners } from './events.js';
import { appState } from './state.js';


function init() {
    console.log("ArchViz Pro Studio: Initializing application...");

    // For now, we will bypass the project manager and go straight to the editor
    ui.showEditor();

    // Initialize the core editor functionality
    editor.init();

    // Set up all the user interaction event listeners
    initializeEventListeners();

    // Set initial UI states
    ui.updateUndoRedoButtons();
    ui.updateObjectList();
    ui.updateSelectionPropertiesVisibility();

    console.log("ArchViz Pro Studio: Application initialized.");
}

// Wait for the DOM to be fully loaded before initializing the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}