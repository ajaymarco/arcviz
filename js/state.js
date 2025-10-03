import * as THREE from 'three';

// --- Global App State ---
export const appState = {
    currentProjectId: null,
    currentProjectName: "Untitled Project",
    isEditorInitialized: false,
    projects: [], // Will be loaded from localStorage
};

// --- Editor & Scene State ---
export const editorState = {
    scene: null,
    camera: null,
    renderer: null,
    orbitControls: null,
    transformControls: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    selectedObject: null,
    selectedLight: null,
    objects: [],
    lights: [],
    defaultAmbientLight: null,
    defaultDirectionalLight: null,
    history: [],
    historyIndex: -1,
    isSnappingEnabled: false,
    stats: null,
    groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
};

// --- Active Tool State ---
export const toolState = {
    isDrawingRectangle: false,
    rectangleStartPoint: null,
    rectanglePreviewMesh: null,

    isDrawingWall: false,
    wallPoints: [],
    wallPreviewLine: null,

    isPushPullMode: false,
    objectToPushPull: null,
    pushPullFaceNormal: null,
    pushPullFaceIndex: -1,
};

// --- UI-related State ---
export const uiState = {
    currentConfirmCallback: null,
};

// --- Constants ---
export const constants = {
    LOCAL_STORAGE_PROJECTS_KEY: 'archVizProProjects_v3',
    EDITOR_MAX_HISTORY_STATES: 50,
};