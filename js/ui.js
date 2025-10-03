import { appState, editorState, uiState } from './state.js';
import * as THREE from 'three';

class UI {
    constructor() {
        this.elements = {};
        this.cacheElements();
    }

    cacheElements() {
        const elementIds = [
            'project-manager-view', 'project-manager-loading', 'project-list', 'no-projects-message',
            'createNewProjectBtn', 'newProjectModal', 'projectNameInput', 'cancelNewProjectBtn', 'confirmNewProjectBtn',
            'confirmDeleteModal', 'confirmDeleteMessage', 'cancelDeleteBtn', 'confirmDeleteBtn',
            'globalMessageBox', 'editor-view', 'app-container', 'top-toolbar', 'backToProjectsBtn',
            'currentProjectNameDisplay', 'saveProjectBtn', 'exportSceneJsonBtn', 'importSceneJsonBtn',
            'undoBtn', 'redoBtn', 'settingsBtn', 'helpBtn', 'measureToolBtn', 'main-content',
            'left-sidebar', 'left-sidebar-tabs', 'left-sidebar-content', 'create-panel',
            'primitive-shapes-content', 'addCubeBtn', 'addSphereBtn', 'addCylinderBtn', 'addPlaneBtn',
            'addTorusBtn', 'addConeBtn', 'addText3DBtn', 'arch-tools-content', 'createBoxBtn',
            'addRectangleBtn', 'addWallBtn', 'addSlabBtn', 'pushPullBtn', 'addStairsBtn', 'addDoorBtn',
            'addWindowBtn', 'addRoofBtn', 'drawing-tools-content', 'drawPolylineBtn', 'drawArcBtn',
            'importSvgBtn', 'importFloorplanBtn', 'floorplan-file-input', 'lighting-elements-content',
            'addPointLightBtn', 'addDirectionalLightBtn', 'addSpotLightBtn', 'addAmbientLightBtn',
            'addAreaLightBtn', 'toggleLightHelpersBtn', 'scene-panel', 'scene-explorer-content',
            'objectList', 'layers-panel-content', 'newLayerName', 'addLayerBtn', 'layerList',
            'camera-settings-scene-content', 'cameraFOV', 'cameraNear', 'cameraFar', 'saveNamedViewBtn',
            'assets-browser-panel', 'local-assets-content', 'loadFolderBtn', 'asset-grid',
            'library-panel', 'asset-library-content', 'model-file-input', 'importModelBtn',
            'hdri-library-content', 'loadHdriBtn', 'left-sidebar-toggle', 'viewport-container',
            'renderCanvasContainer', 'renderCanvas', 'viewport-overlay', 'shadingModeSelect',
            'viewport-toolbar', 'viewTranslateBtn', 'viewRotateBtn', 'viewScaleBtn', 'viewTopBtn',
            'viewFrontBtn', 'viewSideBtn', 'viewIsoBtn', 'viewResetBtn', 'viewFrameBtn', 'toggleSnappingBtn',
            'snappingOptionsSelect', 'editorMessageBox', 'loadingOverlay', 'loadingOverlayText',
            'jsonMessageBoxEditor', 'jsonBoxEditorTitle', 'jsonOutputEditor', 'copyJsonEditorBtn',
            'loadJsonEditorBtn', 'closeJsonBoxEditorBtn', 'right-sidebar-toggle', 'right-sidebar',
            'right-sidebar-tabs', 'right-sidebar-content', 'selection-props-panel', 'objectProperties',
            'lightPropertiesDisplay', 'selected-light-details-content', 'lightName', 'lightColor',
            'lightIntensity', 'lightDistanceGroup', 'lightDistance', 'lightDecayGroup', 'lightDecay',
            'lightAngleGroup', 'lightAngle', 'lightPenumbraGroup', 'lightPenumbra', 'deleteLightBtn',
            'noSelectionMessage', 'render-panel', 'render-settings-content', 'renderResolution',
            'renderSamples', 'renderOutputFormat', 'denoiseRender', 'render-actions-content',
            'renderImageBtn', 'renderVideoBtn', 'addToRenderQueueBtn', 'animation-timeline-content',
            'playAnimationBtn', 'timelineSlider', 'currentFrame', 'frameRate', 'addKeyframeBtn',
            'environment-panel', 'world-background-content', 'sceneBgColor', 'hdriEnvironment',
            'uploadHdriBtn', 'sun-sky-system-content', 'sunIntensity', 'sunAzimuth', 'sunElevation',
            'global-illumination-content', 'ambientLightColor', 'ambientLightIntensity',
            'fog-atmosphere-content', 'fogEnable', 'fogColor', 'fogNear', 'fogFar',
            'confirmModalOverlayEditor', 'confirmModalMessageEditor', 'confirmModalNoEditor', 'confirmModalYesEditor',
            'dimensionModalOverlayEditor', 'dimensionModalTitleEditor', 'boxWidth', 'boxHeight', 'boxDepth',
            'createBoxCancelBtnEditor', 'createBoxConfirmBtnEditor', 'extrusionModalOverlayEditor',
            'extrusionHeightInput', 'cancelExtrusionBtnEditor', 'confirmExtrusionBtnEditor'
        ];
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    showEditor() {
        this.elements['project-manager-view'].style.display = 'none';
        this.elements['editor-view'].style.display = 'block';
        this.elements['app-container'].style.display = 'flex';
    }

    showProjectManager() {
        this.elements['editor-view'].style.display = 'none';
        this.elements['project-manager-view'].style.display = 'flex';
    }

    showGlobalMessageBox(message, type = 'info', duration = 3000) {
        const gmb = this.elements.globalMessageBox;
        if (!gmb) return;
        gmb.textContent = message;
        gmb.className = 'message-box';
        if (type === 'success') gmb.classList.add('success');
        else if (type === 'error') gmb.classList.add('error');
        gmb.classList.add('show');
        setTimeout(() => gmb.classList.remove('show'), duration);
    }

    showEditorMessageBox(message, type = 'info', duration = 2500) {
        const emb = this.elements.editorMessageBox;
        if (!emb) return;
        emb.textContent = message;
        emb.className = 'message-box';
        if (type === 'success') emb.classList.add('success');
        else if (type === 'error') emb.classList.add('error');
        emb.classList.add('show');
        setTimeout(() => emb.classList.remove('show'), duration);
    }

    showConfirmModal(message, callback) {
        const modal = this.elements.confirmModalOverlayEditor;
        const msg = this.elements.confirmModalMessageEditor;
        if (!modal || !msg) return;
        msg.textContent = message;
        uiState.currentConfirmCallback = callback;
        modal.classList.add('show');
    }

    hideConfirmModal() {
        const modal = this.elements.confirmModalOverlayEditor;
        if(modal) modal.classList.remove('show');
        uiState.currentConfirmCallback = null;
    }

    showDimensionModal() {
        const modal = this.elements.dimensionModalOverlayEditor;
        if (!modal) return;
        this.elements.boxWidth.value = 1;
        this.elements.boxHeight.value = 1;
        this.elements.boxDepth.value = 1;
        modal.classList.add('show');
        this.elements.boxWidth.focus();
    }

    hideDimensionModal() {
        const modal = this.elements.dimensionModalOverlayEditor;
        if (modal) modal.classList.remove('show');
    }

    updateUndoRedoButtons() {
        if (this.elements.undoBtn) this.elements.undoBtn.disabled = editorState.historyIndex <= 0;
        if (this.elements.redoBtn) this.elements.redoBtn.disabled = editorState.historyIndex >= editorState.history.length - 1;
    }

    updateTransformModeButtons(activeMode) {
        if (this.elements.viewTranslateBtn) this.elements.viewTranslateBtn.classList.toggle('active', activeMode === 'translate');
        if (this.elements.viewRotateBtn) this.elements.viewRotateBtn.classList.toggle('active', activeMode === 'rotate');
        if (this.elements.viewScaleBtn) this.elements.viewScaleBtn.classList.toggle('active', activeMode === 'scale');
    }

    updateObjectList() {
        const objectListPanel = this.elements.objectList;
        if (!objectListPanel) return;
        objectListPanel.innerHTML = '';

        const allElements = [
            ...editorState.objects, ...editorState.lights,
            ...(editorState.defaultAmbientLight ? [editorState.defaultAmbientLight] : []),
            ...(editorState.defaultDirectionalLight ? [editorState.defaultDirectionalLight] : [])
        ].filter(Boolean);

        if (allElements.length === 0) {
            objectListPanel.innerHTML = '<p class="helper-text">Scene is empty.</p>';
            return;
        }

        allElements.forEach(element => {
            if (!element || !element.name) return;

            const listItem = document.createElement('div');
            listItem.className = 'object-list-item';
            listItem.dataset.uuid = element.uuid;

            let iconClass = 'fas fa-question-circle'; // Default icon
            if (element.isLight) {
                iconClass = 'fas fa-lightbulb';
            } else if (element.isMesh) {
                iconClass = 'fas fa-cube';
            }

            listItem.innerHTML = `<i class="${iconClass} mr-2"></i> <span class="flex-grow truncate" title="${element.name}">${element.name}</span>`;

            if (element === editorState.selectedObject || element === editorState.selectedLight) {
                listItem.classList.add('selected');
            }

            listItem.addEventListener('click', () => {
                // This should be handled by an event handler in events.js that calls a function in actions.js
                console.log(`Selected ${element.name}`);
            });
            objectListPanel.appendChild(listItem);
        });
    }

    updateSelectionPropertiesVisibility() {
        const hasObjectSelection = !!editorState.selectedObject;
        const hasLightSelection = !!editorState.selectedLight;
        const { objectProperties, lightPropertiesDisplay, noSelectionMessage } = this.elements;

        if(objectProperties) objectProperties.style.display = hasObjectSelection ? 'block' : 'none';
        if(lightPropertiesDisplay) lightPropertiesDisplay.style.display = hasLightSelection ? 'block' : 'none';
        if(noSelectionMessage) noSelectionMessage.style.display = (!hasObjectSelection && !hasLightSelection) ? 'block' : 'none';
    }

    updateSelectedObjectPropertiesPanel() {
        const object = editorState.selectedObject;
        const propertiesPanel = this.elements.objectProperties;
        if (!object || !propertiesPanel) {
            if (propertiesPanel) propertiesPanel.innerHTML = ''; // Clear panel if no selection
            return;
        }

        const createVector3Input = (label, vector, property) => {
            return `
                <div class="editor-input-group">
                    <label>${label}</label>
                    <div class="flex space-x-1">
                        <input type="number" step="0.1" class="editor-input-field" data-property="${property}" data-axis="x" value="${vector.x.toFixed(2)}">
                        <input type="number" step="0.1" class="editor-input-field" data-property="${property}" data-axis="y" value="${vector.y.toFixed(2)}">
                        <input type="number" step="0.1" class="editor-input-field" data-property="${property}" data-axis="z" value="${vector.z.toFixed(2)}">
                    </div>
                </div>
            `;
        };

        propertiesPanel.innerHTML = `
            <div class="section">
                <h2 class="section-title" data-section="object-details">Object Details <i class="fas fa-chevron-down"></i></h2>
                <div class="section-content" id="object-details-content">
                    <div class="editor-input-group">
                        <label for="objectName">Name</label>
                        <input type="text" id="objectName" class="editor-input-field" value="${object.name}">
                    </div>
                    <div class="editor-input-group">
                        <label>Type</label>
                        <span class="text-gray-400 text-sm">${object.userData.type || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="section">
                <h2 class="section-title" data-section="object-transform">Transform <i class="fas fa-chevron-down"></i></h2>
                <div class="section-content" id="object-transform-content">
                    ${createVector3Input('Position', object.position, 'position')}
                    ${createVector3Input('Rotation', object.rotation.toVector3(), 'rotation')}
                    ${createVector3Input('Scale', object.scale, 'scale')}
                </div>
            </div>
             <div class="section">
                <h2 class="section-title" data-section="object-material">Material <i class="fas fa-chevron-down"></i></h2>
                <div class="section-content" id="object-material-content">
                    <p class="helper-text">Material editor coming soon.</p>
                </div>
            </div>
        `;

        // Add event listeners for the new inputs
        const nameInput = propertiesPanel.querySelector('#objectName');
        nameInput.addEventListener('change', (e) => {
            if(editorState.selectedObject) editorState.selectedObject.name = e.target.value;
            this.updateObjectList();
        });

        propertiesPanel.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                if(!editorState.selectedObject) return;

                const property = e.target.dataset.property; // 'position', 'rotation', 'scale'
                const axis = e.target.dataset.axis; // 'x', 'y', 'z'
                const value = parseFloat(e.target.value);

                if (property === 'rotation') {
                    // Convert degrees to radians for rotation
                    editorState.selectedObject.rotation[axis] = THREE.MathUtils.degToRad(value);
                } else {
                    editorState.selectedObject[property][axis] = value;
                }
            });
        });
    }

    updateSelectedLightPropertiesPanel() {
        const light = editorState.selectedLight;
        if (!light || !this.elements.lightPropertiesDisplay) return;
        // Simplified for now. Will be expanded later.
        this.elements.lightPropertiesDisplay.innerHTML = `<div>Name: ${light.name}</div>`;
    }
}

export const ui = new UI();