import { ui } from './ui.js';
import { editor } from './editor.js';
import { appState, editorState, uiState } from './state.js';
import * as actions from './actions.js';
import * as history from './history.js';
import { UpdateTransformCommand } from './commands.js';
import { createNewProject, deleteConfirmedProject } from './projectManager.js';
import * as THREE from 'three';

export function initializeEventListeners() {
    console.log("Initializing event listeners...");

    const { elements } = ui;

    // Project Management
	elements.createNewProjectBtn?.addEventListener('click', () => {
        elements.newProjectModal.classList.add('show');
        elements.projectNameInput.value = '';
        elements.projectNameInput.focus();
    });

    elements.cancelNewProjectBtn?.addEventListener('click', () => {
        elements.newProjectModal.classList.remove('show');
    });

    elements.confirmNewProjectBtn?.addEventListener('click', createNewProject);

    elements.cancelDeleteBtn?.addEventListener('click', () => {
        elements.confirmDeleteModal.classList.remove('show');
    });

    elements.confirmDeleteBtn?.addEventListener('click', deleteConfirmedProject);

    elements.backToProjectsBtn?.addEventListener('click', () => {
        // This is a temporary solution. A more robust implementation
        // would prompt the user to save any unsaved changes.
        ui.showProjectManager();
        // We may need to add a function to reload the project list here if it's not dynamic
    });


    // Top Toolbar
    elements.undoBtn?.addEventListener('click', history.undo);
    elements.redoBtn?.addEventListener('click', history.redo);

    // Left Sidebar - Create
    elements.addCubeBtn?.addEventListener('click', () => actions.addObject(new THREE.BoxGeometry(1, 1, 1), 'Cube'));
    elements.addSphereBtn?.addEventListener('click', () => actions.addObject(new THREE.SphereGeometry(0.75, 32, 16), 'Sphere'));
    elements.addCylinderBtn?.addEventListener('click', () => actions.addObject(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32), 'Cylinder'));
    elements.addPlaneBtn?.addEventListener('click', () => {
        const plane = actions.addObject(new THREE.PlaneGeometry(10, 10), 'Plane');
        if (plane) plane.rotation.x = -Math.PI / 2;
    });
    elements.createBoxBtn?.addEventListener('click', () => ui.showDimensionModal());

    // Left Sidebar - Lighting
    elements.addPointLightBtn?.addEventListener('click', () => actions.addLight('Point'));
    elements.addDirectionalLightBtn?.addEventListener('click', () => actions.addLight('Directional'));
    elements.addSpotLightBtn?.addEventListener('click', () => actions.addLight('Spot'));

    // Viewport Toolbar
    elements.viewTranslateBtn?.addEventListener('click', () => actions.setTransformMode('translate'));
    elements.viewRotateBtn?.addEventListener('click', () => actions.setTransformMode('rotate'));
    elements.viewScaleBtn?.addEventListener('click', () => actions.setTransformMode('scale'));
    elements.viewTopBtn?.addEventListener('click', () => editor.setCameraView('top'));
    elements.viewFrontBtn?.addEventListener('click', () => editor.setCameraView('front'));
    elements.viewSideBtn?.addEventListener('click', () => editor.setCameraView('side'));
    elements.viewIsoBtn?.addEventListener('click', () => editor.setCameraView('iso'));

    // Modals
    elements.createBoxConfirmBtnEditor?.addEventListener('click', actions.createBoxWithDimensions);
    elements.createBoxCancelBtnEditor?.addEventListener('click', () => ui.hideDimensionModal());
    elements.confirmModalYesEditor?.addEventListener('click', () => {
        if (uiState.currentConfirmCallback) {
            uiState.currentConfirmCallback(true);
        }
    });
    elements.confirmModalNoEditor?.addEventListener('click', () => {
        if (uiState.currentConfirmCallback) {
            uiState.currentConfirmCallback(false);
        }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;

        const isCtrlCmd = e.ctrlKey || e.metaKey;

        if (isCtrlCmd && e.key.toLowerCase() === 'z') { e.preventDefault(); history.undo(); }
        if (isCtrlCmd && e.key.toLowerCase() === 'y') { e.preventDefault(); history.redo(); }

        if (editorState.selectedObject || editorState.selectedLight) {
            switch (e.key.toLowerCase()) {
                case 't': actions.setTransformMode('translate'); break;
                case 'r': actions.setTransformMode('rotate'); break;
                case 's': actions.setTransformMode('scale'); break;
                case 'delete':
                case 'backspace':
                    actions.deleteSelected();
                    break;
            }
        }
    });

    // Canvas interaction
    elements.renderCanvas?.addEventListener('click', (event) => {
        if (editorState.transformControls.dragging) return;

        const rect = elements.renderCanvas.getBoundingClientRect();
        editorState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        editorState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        editorState.raycaster.setFromCamera(editorState.mouse, editorState.camera);

        const intersects = editorState.raycaster.intersectObjects(editorState.objects, false);
        if (intersects.length > 0) {
            const firstIntersected = intersects[0].object;
            if (editorState.selectedObject !== firstIntersected) {
                editor.selectObject(firstIntersected);
            }
        } else {
            editor.selectObject(null);
        }
    });

    // Transform controls save state on change
    editorState.transformControls?.addEventListener('mouseDown', () => {
        const object = editorState.transformControls.object;
        if (object) {
            editorState.transformStart = {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
            };
        }
    });

    editorState.transformControls?.addEventListener('mouseUp', () => {
        const object = editorState.transformControls.object;
        if (object && editorState.transformStart) {
            const oldTransform = editorState.transformStart;
            const newTransform = {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone(),
            };

            // Only create a command if the transform has actually changed
            if (!oldTransform.position.equals(newTransform.position) ||
                !oldTransform.rotation.equals(newTransform.rotation) ||
                !oldTransform.scale.equals(newTransform.scale)) {
                history.executeCommand(new UpdateTransformCommand(object, newTransform, oldTransform));
            }
        }
        editorState.transformStart = null;
    });

    console.log("Event listeners initialized.");
}