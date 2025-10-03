import { editorState, constants } from './state.js';
import { ui } from './ui.js';

const historyStack = [];
let historyIndex = -1;

/**
 * Executes a command and adds it to the history stack.
 * @param {Command} command - The command to execute.
 */
export function executeCommand(command) {
    if (historyIndex < historyStack.length - 1) {
        historyStack.splice(historyIndex + 1);
    }

    historyStack.push(command);

    if (historyStack.length > constants.EDITOR_MAX_HISTORY_STATES) {
        historyStack.shift();
    }

    historyIndex = historyStack.length - 1;

    command.execute();
    ui.updateUndoRedoButtons();
}

/**
 * Undoes the last command.
 */
export function undo() {
    if (historyIndex >= 0) {
        const command = historyStack[historyIndex];
        command.undo();
        historyIndex--;
        ui.updateUndoRedoButtons();
        ui.showEditorMessageBox(`Undo: ${command.name}`, "info", 1000);
    }
}

/**
 * Redoes the last undone command.
 */
export function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const command = historyStack[historyIndex];
        command.execute();
        ui.updateUndoRedoButtons();
        ui.showEditorMessageBox(`Redo: ${command.name}`, "info", 1000);
    }
}

/**
 * Clears the history stack.
 */
export function clearHistory() {
    historyStack.length = 0;
    historyIndex = -1;
    ui.updateUndoRedoButtons();
}