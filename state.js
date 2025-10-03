// state.js - Manages the global application state.
export const state = {
    currentProjectId: null,
    currentProjectName: "Untitled Project",
    isDrawingRectangle: false,
    rectangleStartPoint: null,
    isPushPullMode: false,
    objectToPushPull: null,
    pushPullFaceNormal: null,
    pushPullFaceIndex: -1,
    isDrawingWall: false,
    wallPoints: [],
    isEditorInitialized: false,
    isSnappingEnabled: false,
    editorHistory: [],
    editorHistoryIndex: -1,
    currentEditorConfirmCallback: null,
};

export const CONSTANTS = {
    LOCAL_STORAGE_PROJECTS_KEY: 'archVizProProjects_v4',
    EDITOR_MAX_HISTORY_STATES: 50,
};

export const editorObjects = [];
export const editorLights = [];