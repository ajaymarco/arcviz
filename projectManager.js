// projectManager.js - Handles loading, creating, and deleting projects from localStorage.
import { state, CONSTANTS } from './state.js';
import { ui, showGlobalMessageBox, switchEditorTab } from './ui.js';
import { initEditorThreeJS, editorApplyState, isEditorInitialized, switchToProjectManager, editorSaveState, updateEditorUndoRedoButtons } from './editor.js';
import { setEditorTransformMode } from './actions.js';

let projectToDeleteId = null;

function getProjectsFromLocalStorage() {
    const projectsJSON = localStorage.getItem(CONSTANTS.LOCAL_STORAGE_PROJECTS_KEY);
    try {
        return projectsJSON ? JSON.parse(projectsJSON) : [];
    } catch (e) {
        console.error("Error parsing projects from localStorage:", e);
        showGlobalMessageBox("Error loading projects. Data might be corrupted.", "error", 5000);
        localStorage.removeItem(CONSTANTS.LOCAL_STORAGE_PROJECTS_KEY);
        return [];
    }
}

function saveProjectsToLocalStorage(projects) {
    try {
        localStorage.setItem(CONSTANTS.LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
        console.error("Error saving projects to localStorage:", e);
        showGlobalMessageBox("Could not save projects. Storage might be full or unavailable.", "error", 5000);
    }
}

export function loadProjects() {
    if (!ui.projectManagerLoading || !ui.noProjectsMessageUI || !ui.projectListUI) {
        console.warn("loadProjects: Critical project manager UI elements not cached.");
        return;
    }
    ui.projectManagerLoading.style.display = 'block';
    ui.noProjectsMessageUI.style.display = 'none';
    ui.projectListUI.innerHTML = '';

    const projects = getProjectsFromLocalStorage();
    projects.sort((a, b) => (new Date(b.lastModified || 0).getTime()) - (new Date(a.lastModified || 0).getTime()));

    if (projects.length === 0) {
        ui.noProjectsMessageUI.style.display = 'block';
    } else {
        projects.forEach(project => renderProjectItem(project));
    }
    ui.projectManagerLoading.style.display = 'none';
}

function renderProjectItem(project) {
    if (!project || !project.id || !project.projectName || !ui.projectListUI) return;
    const li = document.createElement('li');
    li.className = 'project-list-item';
    li.innerHTML = `
        <span class="project-name" data-project-id="${project.id}" title="Open: ${project.projectName}">${project.projectName}</span>
        <div class="project-actions">
            <button class="btn btn-secondary btn-sm open-project-btn" data-project-id="${project.id}" title="Open Project"><i class="fas fa-folder-open"></i></button>
            <button class="btn btn-danger btn-sm delete-project-btn" data-project-id="${project.id}" title="Delete Project"><i class="fas fa-trash"></i></button>
        </div>
    `;
    ui.projectListUI.appendChild(li);

    const nameSpan = li.querySelector('.project-name');
    const openBtn = li.querySelector('.open-project-btn');
    const deleteBtn = li.querySelector('.delete-project-btn');

    if (nameSpan) nameSpan.addEventListener('click', () => openProject(project.id, project.projectName));
    if (openBtn) openBtn.addEventListener('click', () => openProject(project.id, project.projectName));
    if (deleteBtn) deleteBtn.addEventListener('click', () => confirmProjectDeletion(project.id, project.projectName));
}

function confirmProjectDeletion(projectId, projectName) {
    if (!ui.confirmDeleteModal || !ui.confirmDeleteMessageUI) return;
    projectToDeleteId = projectId;
    ui.confirmDeleteMessageUI.textContent = `Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`;
    ui.confirmDeleteModal.classList.add('show');
}

export function deleteConfirmedProject() {
    if (!projectToDeleteId || !ui.confirmDeleteBtn) return;
    ui.confirmDeleteBtn.disabled = true;
    ui.confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Deleting...';

    try {
        let projects = getProjectsFromLocalStorage();
        projects = projects.filter(p => p.id !== projectToDeleteId);
        saveProjectsToLocalStorage(projects);

        if (ui.confirmDeleteModal) ui.confirmDeleteModal.classList.remove('show');
        showGlobalMessageBox("Project deleted successfully.", "success");
        loadProjects();
    } catch (e) {
        console.error("Error deleting project:", e);
        showGlobalMessageBox("Failed to delete project. See console for details.", "error");
    } finally {
        ui.confirmDeleteBtn.disabled = false;
        ui.confirmDeleteBtn.innerHTML = 'Delete Project';
        projectToDeleteId = null;
    }
}

export function createNewProject() {
    if (!ui.projectNameInput || !ui.confirmNewProjectBtn) return;
    const name = ui.projectNameInput.value.trim();
    if (!name) {
        showGlobalMessageBox("Project name cannot be empty.", "error");
        return;
    }
    ui.confirmNewProjectBtn.disabled = true;
    ui.confirmNewProjectBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

    try {
        const projects = getProjectsFromLocalStorage();
        const newProject = {
            id: generateUUID(),
            projectName: name,
            sceneData: JSON.stringify(getInitialSceneState()),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        projects.push(newProject);
        saveProjectsToLocalStorage(projects);

        if (ui.newProjectModal) ui.newProjectModal.classList.remove('show');
        showGlobalMessageBox(`Project "${name}" created! Opening...`, "success", 2000);
        setTimeout(() => openProject(newProject.id, name), 100);
    } catch (e) {
        console.error("Error creating new project:", e);
        showGlobalMessageBox("Failed to create project. See console for details.", "error");
    } finally {
        ui.confirmNewProjectBtn.disabled = false;
        ui.confirmNewProjectBtn.innerHTML = 'Create Project';
    }
}

function openProject(projectId, projectName) {
    console.log("Attempting to open project:", projectName, "ID:", projectId);
    if (!ui.editorView || !ui.projectManagerView || !ui.currentProjectNameDisplay) {
        console.error("Open project: Critical UI elements missing.");
        showGlobalMessageBox("Error opening project: UI components missing.", "error");
        return;
    }

    state.currentProjectId = projectId;
    state.currentProjectName = projectName;
    ui.currentProjectNameDisplay.textContent = state.currentProjectName;
    showGlobalMessageBox(`Opening project "${state.currentProjectName}"...`, "info", 1500);

    ui.projectManagerView.style.display = 'none';
    ui.editorView.style.display = 'block';
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.style.display = 'flex';

    const projects = getProjectsFromLocalStorage();
    const projectData = projects.find(p => p.id === state.currentProjectId);

    if (projectData) {
        console.log("Project data found for", state.currentProjectName);
        let sceneJSON;
        try {
            if (projectData.sceneData && typeof projectData.sceneData === 'string') {
                JSON.parse(projectData.sceneData);
                sceneJSON = projectData.sceneData;
            } else {
                console.warn("Invalid or missing sceneData in localStorage for project:", state.currentProjectName, ". Resetting to initial state.");
                sceneJSON = JSON.stringify(getInitialSceneState());
            }
        } catch (e) {
            console.warn("Error parsing sceneData for project:", state.currentProjectName, ". Resetting to initial state.", e);
            sceneJSON = JSON.stringify(getInitialSceneState());
            const projectIndex = projects.findIndex(p => p.id === state.currentProjectId);
            if (projectIndex > -1) {
                projects[projectIndex].sceneData = sceneJSON;
                saveProjectsToLocalStorage(projects);
            }
        }

        if (!isEditorInitialized()) {
            console.log("Initializing editor for the first time.");
            initEditorThreeJS();
        }

        if (isEditorInitialized()) {
            console.log("Applying scene state for", state.currentProjectName);
            editorApplyState(sceneJSON);
            state.editorHistory.length = 0;
            state.editorHistoryIndex = -1;
            editorSaveState(false);
            switchEditorTab('create-panel', 'left');
            switchEditorTab('selection-props-panel', 'right');
            updateEditorUndoRedoButtons();
            setEditorTransformMode('translate');
            console.log("Project", state.currentProjectName, "opened successfully.");
        } else {
            console.error("Editor failed to initialize. Cannot open project.", state.currentProjectName);
            showGlobalMessageBox(`Error: Editor failed to initialize for ${state.currentProjectName}.`, "error", 4000);
            switchToProjectManager();
        }
    } else {
        console.error("Error: Project data not found for", state.currentProjectName);
        showGlobalMessageBox(`Error: Project data not found for ${state.currentProjectName}. Returning to project manager.`, "error", 4000);
        switchToProjectManager();
    }
}

export function saveCurrentProject() {
    if (!state.currentProjectId) {
        showGlobalMessageBox("No active project to save. Please create or open one.", "error");
        return;
    }
    const projects = getProjectsFromLocalStorage();
    const projectIndex = projects.findIndex(p => p.id === state.currentProjectId);
    if (projectIndex > -1) {
        projects[projectIndex].sceneData = state.editorHistory[state.editorHistoryIndex] || JSON.stringify(getInitialSceneState());
        projects[projectIndex].lastModified = new Date().toISOString();
        saveProjectsToLocalStorage(projects);
        showGlobalMessageBox(`Project "${state.currentProjectName}" saved!`, "success");
    } else {
        showGlobalMessageBox("Error: Could not find current project to save.", "error");
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function getInitialSceneState() {
    const defaultCube = {
        uuid: generateUUID(),
        name: 'Default Cube', type: 'Cube',
        geometryType: 'BoxGeometry', geometryParams: { width: 1, height: 1, depth: 1 },
        position: [0, 0.5, 0],
        rotation: [0, 0, 0], scale: [1, 1, 1],
        material: { color: '#cccccc', emissive: '#000000', roughness: 0.6, metalness: 0.2 }
    };
    return {
        objects: [defaultCube],
        lights: [],
        camera: { position: [8, 8, 8], target: [0, 1, 0], fov: 60, near: 0.1, far: 5000 },
        sceneBgColor: "1a1d21",
        defaultAmbientLightColor: "707070",
        defaultAmbientLightIntensity: 0.5,
    };
}