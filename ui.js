// ui.js - Handles all DOM manipulation, UI updates, and modal interactions.
import { state } from './state.js';

export const ui = {};

export function cacheUiElements() {
    // Project Manager View
    ui.projectManagerView = document.getElementById('project-manager-view');
    ui.projectManagerLoading = document.getElementById('project-manager-loading');
    ui.projectListUI = document.getElementById('project-list');
    ui.noProjectsMessageUI = document.getElementById('no-projects-message');
    ui.createNewProjectBtn = document.getElementById('createNewProjectBtn');
    ui.newProjectModal = document.getElementById('newProjectModal');
    ui.projectNameInput = document.getElementById('projectNameInput');
    ui.cancelNewProjectBtn = document.getElementById('cancelNewProjectBtn');
    ui.confirmNewProjectBtn = document.getElementById('confirmNewProjectBtn');
    ui.confirmDeleteModal = document.getElementById('confirmDeleteModal');
    ui.confirmDeleteMessageUI = document.getElementById('confirmDeleteMessage');
    ui.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    ui.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    ui.globalMessageBox = document.getElementById('globalMessageBox');

    // Editor View
    ui.editorView = document.getElementById('editor-view');
    const editorUiElementsToCache = {
        backToProjectsBtn: 'backToProjectsBtn', currentProjectNameDisplay: 'currentProjectNameDisplay',
        saveProjectBtn: 'saveProjectBtn', exportSceneJsonBtn: 'exportSceneJsonBtn', importSceneJsonBtn: 'importSceneJsonBtn',
        undoBtn: 'undoBtn', redoBtn: 'redoBtn', leftSidebar: 'left-sidebar', rightSidebar: 'right-sidebar',
        leftSidebarToggleBtn: 'left-sidebar-toggle', rightSidebarToggleBtn: 'right-sidebar-toggle',
        addCubeBtn: 'addCubeBtn', addSphereBtn: 'addSphereBtn', addCylinderBtn: 'addCylinderBtn', addPlaneBtn: 'addPlaneBtn',
        addTorusBtn: 'addTorusBtn', addConeBtn: 'addConeBtn', addText3DBtn: 'addText3DBtn',
        createBoxBtn: 'createBoxBtn', addRectangleBtn: 'addRectangleBtn', addWallBtn: 'addWallBtn', addSlabBtn: 'addSlabBtn',
        pushPullBtn: 'pushPullBtn', addStairsBtn: 'addStairsBtn', addDoorBtn: 'addDoorBtn', addWindowBtn: 'addWindowBtn', addRoofBtn: 'addRoofBtn',
        drawPolylineBtn: 'drawPolylineBtn', drawArcBtn: 'drawArcBtn', importSvgBtn: 'importSvgBtn',
        addPointLightBtn: 'addPointLightBtn', addDirectionalLightBtn: 'addDirectionalLightBtn',
        addSpotLightBtn: 'addSpotLightBtn', addAmbientLightBtn: 'addAmbientLightBtn', addAreaLightBtn: 'addAreaLightBtn',
        toggleLightHelpersBtn: 'toggleLightHelpersBtn', objectListPanel: 'objectList',
        cameraFOVInput: 'cameraFOV', cameraNearInput: 'cameraNear', cameraFarInput: 'cameraFar', saveNamedViewBtn: 'saveNamedViewBtn',
        importModelBtn: 'importModelBtn', modelFileInput: 'model-file-input', loadFolderBtn: 'loadFolderBtn', importFloorplanBtn: 'importFloorplanBtn', floorplanFileInput: 'floorplan-file-input',
        renderCanvas: 'renderCanvas', viewTranslateBtn: 'viewTranslateBtn',
        viewRotateBtn: 'viewRotateBtn', viewScaleBtn: 'viewScaleBtn', viewTopBtn: 'viewTopBtn',
        viewFrontBtn: 'viewFrontBtn', viewSideBtn: 'viewSideBtn', viewIsoBtn: 'viewIsoBtn',
        viewResetBtn: 'viewResetBtn', viewFrameBtn: 'viewFrameBtn', toggleSnappingBtn: 'toggleSnappingBtn',
        snappingOptionsSelect: 'snappingOptionsSelect', shadingModeSelect: 'shadingModeSelect',
        selectionPropertiesPanel: 'selection-props-panel', objectPropertiesContainer: 'objectProperties',
        lightPropertiesDisplayContainer: 'lightPropertiesDisplay', noSelectionMessage: 'noSelectionMessage',
        lightNameInput: 'lightName', lightColorInput: 'lightColor', lightIntensityInput: 'lightIntensity',
        lightDistanceInput: 'lightDistance', lightDistanceGroup: 'lightDistanceGroup', lightDecayInput: 'lightDecay',
        lightDecayGroup: 'lightDecayGroup', lightAngleInput: 'lightAngle', lightAngleGroup: 'lightAngleGroup',
        lightPenumbraInput: 'lightPenumbra', lightPenumbraGroup: 'lightPenumbraGroup', deleteLightBtn: 'deleteLightBtn',
        objectOpacityInput: 'objectOpacityEditor',
        renderResolution: 'renderResolution', renderSamples: 'renderSamples', renderOutputFormat: 'renderOutputFormat',
        denoiseRender: 'denoiseRender', addToRenderQueueBtn: 'addToRenderQueueBtn',
        renderImageBtn: 'renderImageBtn', renderVideoBtn: 'renderVideoBtn', timelineSlider: 'timelineSlider',
        currentFrameSpan: 'currentFrame', playAnimationBtn: 'playAnimationBtn', addKeyframeBtn: 'addKeyframeBtn', frameRate: 'frameRate',
        sceneBgColorInput: 'sceneBgColor', ambientLightColorInput: 'ambientLightColor', hdriEnvironmentSelect: 'hdriEnvironment', uploadHdriBtn: 'uploadHdriBtn',
        sunIntensityInput: 'sunIntensity', sunAzimuthSlider: 'sunAzimuth', sunElevationSlider: 'sunElevation',
        fogEnableCheckbox: 'fogEnable', fogColorInput: 'fogColor', fogNearInput: 'fogNear', fogFarInput: 'fogFar',
        ambientLightIntensityInput: 'ambientLightIntensity', editorMessageBox: 'editorMessageBox',
        loadingOverlay: 'loadingOverlay', loadingOverlayText: 'loadingOverlayText',
        jsonMessageBoxEditor: 'jsonMessageBoxEditor', jsonBoxEditorTitle: 'jsonBoxEditorTitle',
        jsonOutputEditor: 'jsonOutputEditor', copyJsonEditorBtn: 'copyJsonEditorBtn',
        loadJsonEditorBtn: 'loadJsonEditorBtn', closeJsonBoxEditorBtn: 'closeJsonBoxEditorBtn',
        confirmModalOverlayEditor: 'confirmModalOverlayEditor', confirmModalMessageEditor: 'confirmModalMessageEditor',
        confirmModalYesEditorBtn: 'confirmModalYesEditor', confirmModalNoEditorBtn: 'confirmModalNoEditor',
        dimensionModalOverlayEditor: 'dimensionModalOverlayEditor', dimensionModalTitleEditor: 'dimensionModalTitleEditor',
        boxWidthInput: 'boxWidth', boxHeightInput: 'boxHeight', boxDepthInput: 'boxDepth',
        createBoxConfirmBtnEditor: 'createBoxConfirmBtnEditor', createBoxCancelBtnEditor: 'createBoxCancelBtnEditor',
        extrusionModalOverlayEditor: 'extrusionModalOverlayEditor', extrusionHeightInput: 'extrusionHeightInput',
        confirmExtrusionBtnEditor: 'confirmExtrusionBtnEditor', cancelExtrusionBtnEditor: 'cancelExtrusionBtnEditor',
        settingsBtn: 'settingsBtn', helpBtn: 'helpBtn', measureToolBtn: 'measureToolBtn'
    };

    for (const key in editorUiElementsToCache) {
        ui[key] = document.getElementById(editorUiElementsToCache[key]);
        if (!ui[key]) {
            console.warn(`UI Element not found during caching: ${key} (ID: ${editorUiElementsToCache[key]})`);
        }
    }
    ui.leftSidebarTabs = document.querySelectorAll('#left-sidebar-tabs .sidebar-tab');
    ui.rightSidebarTabs = document.querySelectorAll('#right-sidebar-tabs .sidebar-tab');
}

export function showGlobalMessageBox(message, type = 'info', duration = 3000) {
    if (!ui.globalMessageBox) {
        console.warn("showGlobalMessageBox: globalMessageBox element not cached yet.");
        return;
    }
    ui.globalMessageBox.textContent = message;
    ui.globalMessageBox.className = 'message-box';
    if (type === 'success') ui.globalMessageBox.classList.add('success');
    else if (type === 'error') ui.globalMessageBox.classList.add('error');
    ui.globalMessageBox.classList.add('show');
    setTimeout(() => ui.globalMessageBox.classList.remove('show'), duration);
}

export function showEditorMessageBox(message, type = 'info', duration = 2500) {
    if (!ui.editorMessageBox) return;
    ui.editorMessageBox.textContent = message;
    ui.editorMessageBox.className = 'message-box';
    if (type === 'success') ui.editorMessageBox.classList.add('success');
    else if (type === 'error') ui.editorMessageBox.classList.add('error');
    ui.editorMessageBox.classList.add('show');
    setTimeout(() => ui.editorMessageBox.classList.remove('show'), duration);
}

export function showEditorConfirmModal(message, callback) {
    if (!ui.confirmModalMessageEditor || !ui.confirmModalOverlayEditor) return;
    ui.confirmModalMessageEditor.textContent = message;
    state.currentEditorConfirmCallback = callback;
    ui.confirmModalOverlayEditor.classList.add('show');
}

export function showEditorDimensionModal() {
    if (!ui.boxWidthInput || !ui.boxHeightInput || !ui.boxDepthInput || !ui.dimensionModalOverlayEditor) return;
    ui.boxWidthInput.value = 1;
    ui.boxHeightInput.value = 1;
    ui.boxDepthInput.value = 1;
    ui.dimensionModalOverlayEditor.classList.add('show');
    ui.boxWidthInput.focus();
}

export function switchEditorTab(tabName, sidebarKey) {
    if (!tabName || !sidebarKey) return;
    const tabsContainer = document.getElementById(`${sidebarKey}-sidebar-tabs`);
    const contentContainer = document.getElementById(`${sidebarKey}-sidebar-content`);
    if (!tabsContainer || !contentContainer) {
        console.warn(`Sidebar tabs or content container not found for ${sidebarKey}`);
        return;
    }

    tabsContainer.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    contentContainer.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    const selectedTabButton = tabsContainer.querySelector(`.sidebar-tab[data-tab="${tabName}"]`);
    const selectedPanelElement = contentContainer.querySelector(`#${tabName}`);
    if (selectedTabButton) selectedTabButton.classList.add('active');
    if (selectedPanelElement) selectedPanelElement.classList.add('active');

    // This will be updated later to avoid circular dependency
    // if (sidebarKey === 'right' && tabName === 'selection-props-panel') {
    //     updateEditorSelectionPropertiesVisibility();
    // }
}

export function toggleEditorSection(titleElement) {
    if (!titleElement || !titleElement.dataset || !titleElement.dataset.section) return;
    const sectionId = titleElement.dataset.section;
    const contentElement = document.getElementById(`${sectionId}-content`);
    if (contentElement) {
        titleElement.classList.toggle('collapsed');
        contentElement.classList.toggle('collapsed');
    }
}

export function updateEditorSelectionPropertiesVisibility(selectedObject, selectedLight) {
    const hasObjectSelection = !!selectedObject;
    const hasLightSelection = !!selectedLight;

    if (ui.objectPropertiesContainer) ui.objectPropertiesContainer.style.display = hasObjectSelection ? 'block' : 'none';
    if (ui.lightPropertiesDisplayContainer) ui.lightPropertiesDisplayContainer.style.display = hasLightSelection ? 'block' : 'none';
    if (ui.noSelectionMessage) ui.noSelectionMessage.style.display = (!hasObjectSelection && !hasLightSelection) ? 'block' : 'none';
}

export function updateEditorTransformModeButtons(activeMode) {
    if (ui.viewTranslateBtn) ui.viewTranslateBtn.classList.toggle('active', activeMode === 'translate');
    if (ui.viewRotateBtn) ui.viewRotateBtn.classList.toggle('active', activeMode === 'rotate');
    if (ui.viewScaleBtn) ui.viewScaleBtn.classList.toggle('active', activeMode === 'scale');
}