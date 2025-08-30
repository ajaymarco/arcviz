// SCRIPT START
    // This script now uses localStorage for project management and includes UI placeholders for future features.
    (function() {
        'use strict';

        console.log("ArchViz Pro Studio: Script execution started.");

        // --- Global Error Handler ---
        window.onerror = function(message, source, lineno, colno, error) {
            console.error("Global error caught:", message, "at", source, lineno, colno, error);
            const displayMessage = `An unexpected error occurred: ${message}. Check console for details.`;
            if (typeof showGlobalMessageBox === 'function') {
                showGlobalMessageBox(displayMessage, 'error', 10000);
            } else if (document.getElementById('globalMessageBox')) {
                 const gmb = document.getElementById('globalMessageBox');
                 gmb.textContent = displayMessage;
                 gmb.className = 'message-box error show';
                 setTimeout(() => gmb.classList.remove('show'), 10000);
            }
            return true;
        };

        // --- Global App State Variables ---
        let currentProjectId = null;
        let currentProjectName = "Untitled Project";
        const LOCAL_STORAGE_PROJECTS_KEY = 'archVizProProjects_v3'; // Updated key

        // --- UI Elements Cache (populated in DOMContentLoaded) ---
        let projectManagerView, projectManagerLoading, projectListUI, noProjectsMessageUI,
            createNewProjectBtn, newProjectModal, projectNameInput, cancelNewProjectBtn,
            confirmNewProjectBtn, confirmDeleteModal, confirmDeleteMessageUI, cancelDeleteBtn,
            confirmDeleteBtn, globalMessageBox, editorView;

        const editorUi = {};

        // --- Editor Tool State Variables ---
        let isDrawingRectangle = false;
        let rectangleStartPoint = null;
        let rectanglePreviewMesh = null;
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        let isPushPullMode = false;
        let objectToPushPull = null;
        let pushPullFaceNormal = null;
        let pushPullFaceIndex = -1;


        // --- Utility Functions ---
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function showGlobalMessageBox(message, type = 'info', duration = 3000) {
            if (!globalMessageBox) {
                console.warn("showGlobalMessageBox: globalMessageBox element not cached yet.");
                return;
            }
            globalMessageBox.textContent = message;
            globalMessageBox.className = 'message-box';
            if (type === 'success') globalMessageBox.classList.add('success');
            else if (type === 'error') globalMessageBox.classList.add('error');
            globalMessageBox.classList.add('show');
            setTimeout(() => globalMessageBox.classList.remove('show'), duration);
        }

        // --- Local Storage Project Management ---
        function getProjectsFromLocalStorage() {
            const projectsJSON = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
            try {
                return projectsJSON ? JSON.parse(projectsJSON) : [];
            } catch (e) {
                console.error("Error parsing projects from localStorage:", e);
                showGlobalMessageBox("Error loading projects. Data might be corrupted.", "error", 5000);
                localStorage.removeItem(LOCAL_STORAGE_PROJECTS_KEY);
                return [];
            }
        }

        function saveProjectsToLocalStorage(projects) {
            try {
                localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
            } catch (e) {
                console.error("Error saving projects to localStorage:", e);
                showGlobalMessageBox("Could not save projects. Storage might be full or unavailable.", "error", 5000);
            }
        }

        // --- Project Manager Logic (using localStorage) ---
        function loadProjects() {
            if (!projectManagerLoading || !noProjectsMessageUI || !projectListUI) {
                console.warn("loadProjects: Critical project manager UI elements not cached.");
                return;
            }
            projectManagerLoading.style.display = 'block';
            noProjectsMessageUI.style.display = 'none';
            projectListUI.innerHTML = '';

            const projects = getProjectsFromLocalStorage();
            projects.sort((a, b) => (new Date(b.lastModified || 0).getTime()) - (new Date(a.lastModified || 0).getTime()));

            if (projects.length === 0) {
                noProjectsMessageUI.style.display = 'block';
            } else {
                projects.forEach(project => renderProjectItem(project));
            }
            projectManagerLoading.style.display = 'none';
        }

        function renderProjectItem(project) {
            if (!project || !project.id || !project.projectName || !projectListUI) return;
            const li = document.createElement('li');
            li.className = 'project-list-item';
            li.innerHTML = `
                <span class="project-name" data-project-id="${project.id}" title="Open: ${project.projectName}">${project.projectName}</span>
                <div class="project-actions">
                    <button class="btn btn-secondary btn-sm open-project-btn" data-project-id="${project.id}" title="Open Project"><i class="fas fa-folder-open"></i></button>
                    <button class="btn btn-danger btn-sm delete-project-btn" data-project-id="${project.id}" title="Delete Project"><i class="fas fa-trash"></i></button>
                </div>
            `;
            projectListUI.appendChild(li);

            const nameSpan = li.querySelector('.project-name');
            const openBtn = li.querySelector('.open-project-btn');
            const deleteBtn = li.querySelector('.delete-project-btn');

            if (nameSpan) nameSpan.addEventListener('click', () => openProject(project.id, project.projectName));
            if (openBtn) openBtn.addEventListener('click', () => openProject(project.id, project.projectName));
            if (deleteBtn) deleteBtn.addEventListener('click', () => confirmProjectDeletion(project.id, project.projectName));
        }

        let projectToDeleteId = null;
        function confirmProjectDeletion(projectId, projectName) {
            if (!confirmDeleteModal || !confirmDeleteMessageUI) return;
            projectToDeleteId = projectId;
            confirmDeleteMessageUI.textContent = `Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`;
            confirmDeleteModal.classList.add('show');
        }

        function openProject(projectId, projectName) {
            console.log("Attempting to open project:", projectName, "ID:", projectId);
            if (!editorView || !projectManagerView || !editorUi.currentProjectNameDisplay) {
                console.error("Open project: Critical UI elements missing.");
                showGlobalMessageBox("Error opening project: UI components missing.", "error");
                return;
            }

            currentProjectId = projectId;
            currentProjectName = projectName;
            editorUi.currentProjectNameDisplay.textContent = currentProjectName;
            showGlobalMessageBox(`Opening project "${projectName}"...`, "info", 1500);

            projectManagerView.style.display = 'none';
            editorView.style.display = 'block';
            const appContainer = document.getElementById('app-container');
            if (appContainer) appContainer.style.display = 'flex';

            const projects = getProjectsFromLocalStorage();
            const projectData = projects.find(p => p.id === currentProjectId);

            if (projectData) {
                console.log("Project data found for", projectName);
                let sceneJSON;
                try {
                    if (projectData.sceneData && typeof projectData.sceneData === 'string') {
                        JSON.parse(projectData.sceneData);
                        sceneJSON = projectData.sceneData;
                    } else {
                         console.warn("Invalid or missing sceneData in localStorage for project:", projectName, ". Resetting to initial state.");
                         sceneJSON = JSON.stringify(getInitialSceneState());
                    }
                } catch (e) {
                    console.warn("Error parsing sceneData for project:", projectName, ". Resetting to initial state.", e);
                    sceneJSON = JSON.stringify(getInitialSceneState());
                    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
                    if (projectIndex > -1) {
                        projects[projectIndex].sceneData = sceneJSON;
                        saveProjectsToLocalStorage(projects);
                    }
                }

                if (!isEditorInitialized) {
                    console.log("Initializing editor for the first time.");
                    initEditorThreeJS();
                    if (isEditorInitialized) editorOnWindowResize();
                }

                if (isEditorInitialized) {
                    console.log("Applying scene state for", projectName);
                    editorApplyState(sceneJSON);
                    editorHistory.length = 0; editorHistoryIndex = -1;
                    editorSaveState(false);
                    switchEditorTab('create-panel', 'left');
                    switchEditorTab('selection-props-panel', 'right');
                    updateEditorUndoRedoButtons();
                    setEditorTransformMode('translate');
                    console.log("Project", projectName, "opened successfully.");
                } else {
                    console.error("Editor failed to initialize. Cannot open project.", projectName);
                    showGlobalMessageBox(`Error: Editor failed to initialize for ${projectName}.`, "error", 4000);
                    switchToProjectManager();
                }
            } else {
                console.error("Error: Project data not found for", projectName);
                showGlobalMessageBox(`Error: Project data not found for ${projectName}. Returning to project manager.`, "error", 4000);
                switchToProjectManager();
            }
        }

        function switchToProjectManager() {
            if (!editorView || !projectManagerView) return;
            cancelActiveToolModes();
            editorView.style.display = 'none';
            projectManagerView.style.display = 'flex';
            currentProjectId = null;
            currentProjectName = "Untitled Project";
            if (editorUi.currentProjectNameDisplay) editorUi.currentProjectNameDisplay.textContent = "No Project";
            loadProjects();
        }

        // --- Editor Three.js & UI Logic ---
        let editorScene, editorCamera, editorRenderer, editorOrbitControls, editorTransformControls;
        let editorRaycaster, editorMouse;
        let editorSelectedObject = null;
        let editorSelectedLight = null;
        const editorObjects = [];
        const editorLights = [];
        let editorDefaultAmbientLight, editorDefaultDirectionalLight;
        const editorHistory = [];
        let editorHistoryIndex = -1;
        const EDITOR_MAX_HISTORY_STATES = 50;
        let isEditorInitialized = false;
        let currentEditorConfirmCallback = null;
        let isSnappingEnabled = false;
        let stats;

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

        function showEditorMessageBox(message, type = 'info', duration = 2500) {
            if (!editorUi.editorMessageBox) return;
            editorUi.editorMessageBox.textContent = message;
            editorUi.editorMessageBox.className = 'message-box';
            if (type === 'success') editorUi.editorMessageBox.classList.add('success');
            else if (type === 'error') editorUi.editorMessageBox.classList.add('error');
            editorUi.editorMessageBox.classList.add('show');
            setTimeout(() => editorUi.editorMessageBox.classList.remove('show'), duration);
        }

        function showEditorConfirmModal(message, callback) {
            if (!editorUi.confirmModalMessageEditor || !editorUi.confirmModalOverlayEditor) return;
            editorUi.confirmModalMessageEditor.textContent = message;
            currentEditorConfirmCallback = callback;
            editorUi.confirmModalOverlayEditor.classList.add('show');
        }

        function initEditorThreeJS() {
            if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined' || typeof THREE.TransformControls === 'undefined') {
                console.error("THREE.js or its controls are not loaded!");
                showGlobalMessageBox("Critical error: Essential 3D libraries not loaded.", "error", 10000);
                isEditorInitialized = false;
                return;
            }

            try {
                console.log("initEditorThreeJS called");
                if (!editorUi.renderCanvas || !editorUi.sceneBgColorInput || !editorUi.ambientLightColorInput || !editorUi.ambientLightIntensityInput) {
                    console.error("Essential UI elements for Three.js init are missing.");
                    showGlobalMessageBox("Critical error: Missing UI for 3D editor init.", "error", 10000);
                    isEditorInitialized = false;
                    return;
                }

                editorScene = new THREE.Scene();
                editorScene.background = new THREE.Color(editorUi.sceneBgColorInput.value || '#1a1d21');

                const canvas = editorUi.renderCanvas;
                const container = canvas.closest('#renderCanvasContainer');
                if (!container) {
                    console.error("Render canvas container not found! Editor cannot initialize.");
                    showGlobalMessageBox("Critical error: Canvas container missing.", "error", 10000);
                    isEditorInitialized = false;
                    return;
                }

                const initialWidth = container.clientWidth || 640;
                const initialHeight = container.clientHeight || 480;

                editorCamera = new THREE.PerspectiveCamera(60, initialWidth / initialHeight, 0.1, 5000);
                editorCamera.position.set(8, 8, 8);

                editorRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
                editorRenderer.setSize(initialWidth, initialHeight);
                editorRenderer.setPixelRatio(window.devicePixelRatio);
                editorRenderer.shadowMap.enabled = true;
                editorRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

                editorOrbitControls = new THREE.OrbitControls(editorCamera, editorRenderer.domElement);
                editorOrbitControls.enableDamping = true;
                editorOrbitControls.dampingFactor = 0.075;
                editorOrbitControls.minDistance = 0.1;
                editorOrbitControls.maxDistance = 2000;
                editorOrbitControls.target.set(0, 1, 0);

                editorTransformControls = new THREE.TransformControls(editorCamera, editorRenderer.domElement);
                editorTransformControls.addEventListener('dragging-changed', event => {
                    editorOrbitControls.enabled = !event.value;
                    if (!event.value && (editorSelectedObject || editorSelectedLight)) {
                        updateEditorSelectedObjectPropertiesPanel();
                        updateEditorSelectedLightPropertiesPanel();
                        editorSaveState();
                    }
                });
                editorTransformControls.setSize(0.8);
                editorScene.add(editorTransformControls);

                editorDefaultAmbientLight = new THREE.AmbientLight(
                    new THREE.Color(editorUi.ambientLightColorInput.value || '#707070'),
                    parseFloat(editorUi.ambientLightIntensityInput.value || 0.5)
                );
                editorDefaultAmbientLight.name = "Default Ambient Light";
                editorScene.add(editorDefaultAmbientLight);

                editorDefaultDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                editorDefaultDirectionalLight.position.set(20, 30, 15);
                editorDefaultDirectionalLight.castShadow = true;
                editorDefaultDirectionalLight.shadow.mapSize.width = 2048;
                editorDefaultDirectionalLight.shadow.mapSize.height = 2048;
                editorDefaultDirectionalLight.shadow.camera.near = 0.5;
                editorDefaultDirectionalLight.shadow.camera.far = 100;
                editorDefaultDirectionalLight.shadow.camera.left = -30;
                editorDefaultDirectionalLight.shadow.camera.right = 30;
                editorDefaultDirectionalLight.shadow.camera.top = 30;
                editorDefaultDirectionalLight.shadow.camera.bottom = -30;
                editorDefaultDirectionalLight.name = "Default Sun Light";
                editorScene.add(editorDefaultDirectionalLight);

                const gridHelper = new THREE.GridHelper(100, 50, 0x4b5162, 0x3a3f4b);
                gridHelper.name = 'EditorGrid';
                editorScene.add(gridHelper);

                editorRaycaster = new THREE.Raycaster();
                editorMouse = new THREE.Vector2();

                window.addEventListener('resize', editorOnWindowResize, false);
                canvas.addEventListener('click', onEditorCanvasClick, false);
                canvas.addEventListener('mousemove', onEditorCanvasMouseMove, false);
                window.addEventListener('keydown', onEditorKeyDown, false);

                initStats();
                isEditorInitialized = true;
                editorAnimate();

                updateEditorSelectionPropertiesVisibility();
                console.log("initEditorThreeJS completed successfully.");
            } catch (error) {
                console.error("Error during initEditorThreeJS:", error);
                showGlobalMessageBox("Critical error initializing 3D editor. Check console.", "error", 10000);
                isEditorInitialized = false;
            }
        }

        function editorOnWindowResize() {
            if (!isEditorInitialized || !editorRenderer || !editorCamera) return;
            const canvas = editorRenderer.domElement;
            if (!canvas) return;
            const container = canvas.closest('#renderCanvasContainer');
            if (!container) return;

            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;

            if (newWidth > 0 && newHeight > 0) {
                editorCamera.aspect = newWidth / newHeight;
                editorCamera.updateProjectionMatrix();
                editorRenderer.setSize(newWidth, newHeight);
            } else {
                console.warn("Window resize resulted in zero or invalid dimensions for container. Renderer not resized.");
            }
        }

        function editorAnimate() {
            if (!isEditorInitialized) {
                console.log("Editor animation loop stopped as editor is not initialized.");
                return;
            }
            requestAnimationFrame(editorAnimate);
            try {
                if (editorOrbitControls) editorOrbitControls.update();
                if (editorRenderer && editorScene && editorCamera) {
                    editorRenderer.render(editorScene, editorCamera);
                }
                if (stats && stats.dom && stats.dom.style.display !== 'none') stats.update();
            } catch (e) {
                console.error("Error in animation loop:", e);
            }
        }

        function setupEditorEventListeners() {
            if (editorUi.backToProjectsBtn) editorUi.backToProjectsBtn.addEventListener('click', switchToProjectManager);
            if (editorUi.saveProjectBtn) editorUi.saveProjectBtn.addEventListener('click', () => {
                if (!currentProjectId) {
                    showEditorMessageBox("No active project to save. Please create or open one.", "error");
                    return;
                }
                const projects = getProjectsFromLocalStorage();
                const projectIndex = projects.findIndex(p => p.id === currentProjectId);
                if (projectIndex > -1) {
                    projects[projectIndex].sceneData = editorHistory[editorHistoryIndex] || JSON.stringify(getInitialSceneState());
                    projects[projectIndex].lastModified = new Date().toISOString();
                    saveProjectsToLocalStorage(projects);
                    showEditorMessageBox(`Project "${currentProjectName}" saved!`, "success");
                } else {
                    showEditorMessageBox("Error: Could not find current project to save.", "error");
                }
            });
            if (editorUi.exportSceneJsonBtn) editorUi.exportSceneJsonBtn.addEventListener('click', showEditorExportSceneDialog);
            if (editorUi.importSceneJsonBtn) editorUi.importSceneJsonBtn.addEventListener('click', showEditorImportSceneDialog);
            if (editorUi.undoBtn) editorUi.undoBtn.addEventListener('click', editorUndo);
            if (editorUi.redoBtn) editorUi.redoBtn.addEventListener('click', editorRedo);

            if (editorUi.leftSidebarTabs) editorUi.leftSidebarTabs.forEach(tab => tab.addEventListener('click', () => switchEditorTab(tab.dataset.tab, 'left')));
            if (editorUi.rightSidebarTabs) editorUi.rightSidebarTabs.forEach(tab => tab.addEventListener('click', () => switchEditorTab(tab.dataset.tab, 'right')));

            document.querySelectorAll('#editor-view .section-title').forEach(title => {
                if (title) title.addEventListener('click', () => toggleEditorSection(title));
            });

            if (editorUi.addCubeBtn) editorUi.addCubeBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                const cube = editorAddObject(new THREE.BoxGeometry(1, 1, 1), 'Cube');
                if(cube) cube.position.set(0, 0.5, 0);
                editorSaveState();
            });
            if (editorUi.addSphereBtn) editorUi.addSphereBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                const sphere = editorAddObject(new THREE.SphereGeometry(0.75, 32, 16), 'Sphere');
                if(sphere) sphere.position.set(0, 0.75, 0);
                editorSaveState();
            });
            if (editorUi.addCylinderBtn) editorUi.addCylinderBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                const cylinder = editorAddObject(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32), 'Cylinder');
                if(cylinder) cylinder.position.set(0, 0.75, 0);
                editorSaveState();
            });
            if (editorUi.addPlaneBtn) editorUi.addPlaneBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                const planeMesh = editorAddObject(new THREE.PlaneGeometry(10, 10), 'Plane');
                if(planeMesh && planeMesh.rotation) {
                    planeMesh.rotation.x = -Math.PI / 2;
                    planeMesh.position.y = 0;
                }
                editorSaveState();
            });
            if (editorUi.createBoxBtn) editorUi.createBoxBtn.addEventListener('click', () => { cancelActiveToolModes(); showEditorDimensionModal(); });
            if (editorUi.addRectangleBtn) editorUi.addRectangleBtn.addEventListener('click', startRectangleDrawing);
            if (editorUi.addWallBtn) editorUi.addWallBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                showEditorMessageBox("Wall Tool: Creating a default wall.", "info");
                const wallGeo = new THREE.BoxGeometry(5, 2.5, 0.2);
                const wallMesh = editorAddObject(wallGeo, "Wall");
                if(wallMesh) wallMesh.position.y = 1.25;
                editorSaveState();
            });
            if (editorUi.addSlabBtn) editorUi.addSlabBtn.addEventListener('click', () => {
                cancelActiveToolModes();
                 const slabGeo = new THREE.BoxGeometry(5, 0.2, 4);
                 const slabMesh = editorAddObject(slabGeo, "Slab");
                 if(slabMesh) slabMesh.position.y = 0.1;
                 editorSaveState();
            });
            if (editorUi.pushPullBtn) editorUi.pushPullBtn.addEventListener('click', startPushPullMode);

            if (editorUi.addPointLightBtn) editorUi.addPointLightBtn.addEventListener('click', () => { cancelActiveToolModes(); editorAddLightObject('Point');});
            if (editorUi.addDirectionalLightBtn) editorUi.addDirectionalLightBtn.addEventListener('click', () => { cancelActiveToolModes(); editorAddLightObject('Directional');});
            if (editorUi.addSpotLightBtn) editorUi.addSpotLightBtn.addEventListener('click', () => { cancelActiveToolModes(); editorAddLightObject('Spot');});
            if (editorUi.addAmbientLightBtn) editorUi.addAmbientLightBtn.addEventListener('click', () => { cancelActiveToolModes(); editorAddLightObject('Ambient');});
            if (editorUi.toggleLightHelpersBtn) editorUi.toggleLightHelpersBtn.addEventListener('click', toggleLightHelpersVisibility);

            ['lightName', 'lightColor', 'lightIntensity', 'lightDistance', 'lightDecay', 'lightAngle', 'lightPenumbra'].forEach(prop => {
                const inputElement = editorUi[`${prop}Input`];
                if(inputElement) {
                    inputElement.addEventListener('change', (e) => {
                        if (editorSelectedLight) {
                            const target = e.target;
                            let value = (target.type === 'color') ? target.value : (target.type === 'number' ? parseFloat(target.value) : target.value);

                            if (target.type === 'number' && isNaN(value)) {
                                showEditorMessageBox(`Invalid number for ${prop}. Reverting.`, "error");
                                console.warn(`NaN input for ${prop}`);
                                return;
                            }
                            switch (prop) {
                                case 'lightName': editorSelectedLight.name = value; updateEditorObjectList(); break;
                                case 'lightColor': if (editorSelectedLight.color) editorSelectedLight.color.set(value); break;
                                case 'lightIntensity': if (editorSelectedLight.intensity !== undefined) editorSelectedLight.intensity = Math.max(0, value); break;
                                case 'lightDistance': if(editorSelectedLight.distance !== undefined) editorSelectedLight.distance = Math.max(0, value); break;
                                case 'lightDecay': if(editorSelectedLight.decay !== undefined) editorSelectedLight.decay = Math.max(0, value); break;
                                case 'lightAngle': if(editorSelectedLight.angle !== undefined) editorSelectedLight.angle = THREE.MathUtils.degToRad(Math.max(0, Math.min(90, value))); break;
                                case 'lightPenumbra': if(editorSelectedLight.penumbra !== undefined) editorSelectedLight.penumbra = Math.max(0, Math.min(1, value)); break;
                            }
                            if (editorSelectedLight.userData && editorSelectedLight.userData.helper) editorSelectedLight.userData.helper.update();
                            editorSaveState();
                        }
                    });
                }
            });
            if(editorUi.deleteLightBtn) editorUi.deleteLightBtn.addEventListener('click', deleteEditorSelectedLight);

            if (editorUi.cameraFOVInput) editorUi.cameraFOVInput.addEventListener('change', (e) => { if(editorCamera) {editorCamera.fov = parseFloat(e.target.value); editorCamera.updateProjectionMatrix(); editorSaveState(); }});
            if (editorUi.cameraNearInput) editorUi.cameraNearInput.addEventListener('change', (e) => { if(editorCamera) {editorCamera.near = parseFloat(e.target.value); editorCamera.updateProjectionMatrix(); editorSaveState(); }});
            if (editorUi.cameraFarInput) editorUi.cameraFarInput.addEventListener('change', (e) => { if(editorCamera) {editorCamera.far = parseFloat(e.target.value); editorCamera.updateProjectionMatrix(); editorSaveState(); }});

            if (editorUi.importModelBtn) {
                editorUi.importModelBtn.addEventListener('click', () => {
                    if (editorUi.modelFileInput) {
                        editorUi.modelFileInput.click();
                    }
                });
            }
            if (editorUi.modelFileInput) {
                editorUi.modelFileInput.addEventListener('change', handleFileSelect, false);
            }

            if (editorUi.viewTranslateBtn) editorUi.viewTranslateBtn.addEventListener('click', () => setEditorTransformMode('translate'));
            if (editorUi.viewRotateBtn) editorUi.viewRotateBtn.addEventListener('click', () => setEditorTransformMode('rotate'));
            if (editorUi.viewScaleBtn) editorUi.viewScaleBtn.addEventListener('click', () => setEditorTransformMode('scale'));
            if (editorUi.viewTopBtn) editorUi.viewTopBtn.addEventListener('click', () => setEditorCameraView('top'));
            if (editorUi.viewFrontBtn) editorUi.viewFrontBtn.addEventListener('click', () => setEditorCameraView('front'));
            if (editorUi.viewSideBtn) editorUi.viewSideBtn.addEventListener('click', () => setEditorCameraView('side'));
            if (editorUi.viewIsoBtn) editorUi.viewIsoBtn.addEventListener('click', () => setEditorCameraView('iso'));
            if (editorUi.viewResetBtn) editorUi.viewResetBtn.addEventListener('click', () => editorResetCamera());
            if (editorUi.viewFrameBtn) editorUi.viewFrameBtn.addEventListener('click', () => frameEditorSelectedObject());
            if (editorUi.toggleSnappingBtn) editorUi.toggleSnappingBtn.addEventListener('click', toggleEditorSnapping);

            if (editorUi.renderImageBtn) editorUi.renderImageBtn.addEventListener('click', editorRenderImage);
            if (editorUi.renderVideoBtn) editorUi.renderVideoBtn.addEventListener('click', () => showEditorMessageBox("Animation rendering is a planned feature.", 'info'));

            if (editorUi.playAnimationBtn) editorUi.playAnimationBtn.addEventListener('click', () => showEditorMessageBox("Animation playback is a planned feature.", 'info'));
            if (editorUi.timelineSlider && editorUi.currentFrameSpan) editorUi.timelineSlider.addEventListener('input', (e) => { editorUi.currentFrameSpan.textContent = `${e.target.value} / ${editorUi.timelineSlider.max}`});
            if (editorUi.addKeyframeBtn) editorUi.addKeyframeBtn.addEventListener('click', () => showEditorMessageBox("Keyframing is a planned feature.", 'info'));

            if (editorUi.sceneBgColorInput) editorUi.sceneBgColorInput.addEventListener('change', (e) => { if(editorScene && editorScene.background) editorScene.background.set(e.target.value); editorSaveState(); });
            if (editorUi.ambientLightColorInput) editorUi.ambientLightColorInput.addEventListener('change', (e) => { if (editorDefaultAmbientLight && editorDefaultAmbientLight.color) editorDefaultAmbientLight.color.set(e.target.value); editorSaveState(); });
            if (editorUi.ambientLightIntensityInput) editorUi.ambientLightIntensityInput.addEventListener('change', (e) => { if (editorDefaultAmbientLight) editorDefaultAmbientLight.intensity = parseFloat(e.target.value); editorSaveState(); });

            if (editorUi.copyJsonEditorBtn) editorUi.copyJsonEditorBtn.addEventListener('click', copyEditorJsonToClipboard);
            if (editorUi.loadJsonEditorBtn) editorUi.loadJsonEditorBtn.addEventListener('click', loadEditorSceneFromJsonInput);
            if (editorUi.closeJsonBoxEditorBtn) editorUi.closeJsonBoxEditorBtn.addEventListener('click', () => { if (editorUi.jsonMessageBoxEditor) editorUi.jsonMessageBoxEditor.classList.remove('show')});

            if (editorUi.createBoxConfirmBtnEditor) editorUi.createBoxConfirmBtnEditor.addEventListener('click', () => {
                if (!editorUi.boxWidthInput || !editorUi.boxHeightInput || !editorUi.boxDepthInput || !editorUi.dimensionModalOverlayEditor) return;
                const width = Math.max(0.01, parseFloat(editorUi.boxWidthInput.value) || 1);
                const height = Math.max(0.01, parseFloat(editorUi.boxHeightInput.value) || 1);
                const depth = Math.max(0.01, parseFloat(editorUi.boxDepthInput.value) || 1);
                const boxMesh = editorAddObject(new THREE.BoxGeometry(width, height, depth), `Box (${width}x${height}x${depth})`);
                if(boxMesh) boxMesh.position.y = height / 2;
                editorUi.dimensionModalOverlayEditor.classList.remove('show');
                editorSaveState();
            });
            if (editorUi.createBoxCancelBtnEditor) editorUi.createBoxCancelBtnEditor.addEventListener('click', () => { if (editorUi.dimensionModalOverlayEditor) editorUi.dimensionModalOverlayEditor.classList.remove('show')});

            if (editorUi.leftSidebarToggleBtn && editorUi.leftSidebar) {
                editorUi.leftSidebarToggleBtn.addEventListener('click', () => {
                    editorUi.leftSidebar.classList.toggle('collapsed');
                    const icon = editorUi.leftSidebarToggleBtn.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-left');
                        icon.classList.toggle('fa-chevron-right');
                    }
                    setTimeout(() => editorOnWindowResize(), 50);
                });
            }
            if (editorUi.rightSidebarToggleBtn && editorUi.rightSidebar) {
                editorUi.rightSidebarToggleBtn.addEventListener('click', () => {
                    editorUi.rightSidebar.classList.toggle('collapsed');
                     const icon = editorUi.rightSidebarToggleBtn.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-right');
                        icon.classList.toggle('fa-chevron-left');
                    }
                    setTimeout(() => editorOnWindowResize(), 50);
                });
            }

            if(editorUi.confirmModalYesEditorBtn) editorUi.confirmModalYesEditorBtn.addEventListener('click', () => {
                if(editorUi.confirmModalOverlayEditor) editorUi.confirmModalOverlayEditor.classList.remove('show');
                if(currentEditorConfirmCallback) currentEditorConfirmCallback(true);
                currentEditorConfirmCallback = null;
            });
             if(editorUi.confirmModalNoEditorBtn) editorUi.confirmModalNoEditorBtn.addEventListener('click', () => {
                if(editorUi.confirmModalOverlayEditor) editorUi.confirmModalOverlayEditor.classList.remove('show');
                if(currentEditorConfirmCallback) currentEditorConfirmCallback(false);
                currentEditorConfirmCallback = null;
            });

            if (editorUi.confirmExtrusionBtnEditor) editorUi.confirmExtrusionBtnEditor.addEventListener('click', performPlaneExtrusion);
            if (editorUi.cancelExtrusionBtnEditor) editorUi.cancelExtrusionBtnEditor.addEventListener('click', () => {
                if (editorUi.extrusionModalOverlayEditor) editorUi.extrusionModalOverlayEditor.classList.remove('show');
                cancelActiveToolModes();
            });
        }

        function populateObjectPropertiesPanel(object) {
            const container = editorUi.objectPropertiesContainer;
            if (!container) { console.warn("Object properties container not found."); return; }
            container.innerHTML = '';
            if (!object || !object.isMesh) {
                return;
            }

            const infoSectionHTML = `
                <div class="section">
                    <h2 class="section-title" data-section="selected-object-info-editor">Selected Object <i class="fas fa-chevron-down"></i></h2>
                    <div class="section-content" id="selected-object-info-editor-content">
                        <div class="editor-input-group"><label for="objectNameEditor">Name</label><input type="text" id="objectNameEditor" value="${object.name || 'Object'}" placeholder="Object Name" class="editor-input-field"></div>
                        <div class="property-group mt-2">
                            <div class="property-group-title">Dimensions (WxHxD)</div>
                            <div class="editor-input-group">
                                <input type="text" id="dimXEditor" readonly class="editor-input-field text-center text-xs p-1">
                                <input type="text" id="dimYEditor" readonly class="editor-input-field text-center text-xs p-1">
                                <input type="text" id="dimZEditor" readonly class="editor-input-field text-center text-xs p-1">
                            </div>
                        </div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', infoSectionHTML);
            editorUi.objectNameInput = container.querySelector('#objectNameEditor');
            if (editorUi.objectNameInput) editorUi.objectNameInput.addEventListener('change', (e) => { if (editorSelectedObject) { editorSelectedObject.name = e.target.value; updateEditorObjectList(); editorSaveState(); } });
            editorUi.dimXInput = container.querySelector('#dimXEditor');
            editorUi.dimYInput = container.querySelector('#dimYEditor');
            editorUi.dimZInput = container.querySelector('#dimZEditor');

            const transformSectionHTML = `
                <div class="section">
                    <h2 class="section-title" data-section="object-transform-editor">Transform <i class="fas fa-chevron-down"></i></h2>
                    <div class="section-content" id="object-transform-editor-content">
                        <div class="property-group">
                            <div class="property-group-title">Position</div>
                            <div class="editor-input-group"><label class="coord-label" for="posXEditor">X</label><input type="number" id="posXEditor" step="0.01" class="editor-input-field"><label class="coord-label" for="posYEditor">Y</label><input type="number" id="posYEditor" step="0.01" class="editor-input-field"><label class="coord-label" for="posZEditor">Z</label><input type="number" id="posZEditor" step="0.01" class="editor-input-field"></div>
                        </div>
                        <div class="property-group">
                            <div class="property-group-title">Rotation (Deg)</div>
                            <div class="editor-input-group"><label class="coord-label" for="rotXEditor">X</label><input type="number" id="rotXEditor" step="0.1" class="editor-input-field"><label class="coord-label" for="rotYEditor">Y</label><input type="number" id="rotYEditor" step="0.1" class="editor-input-field"><label class="coord-label" for="rotZEditor">Z</label><input type="number" id="rotZEditor" step="0.1" class="editor-input-field"></div>
                        </div>
                        <div class="property-group">
                            <div class="property-group-title">Scale</div>
                            <div class="editor-input-group"><label class="coord-label" for="scaleXEditor">X</label><input type="number" id="scaleXEditor" step="0.01" min="0.01" class="editor-input-field"><label class="coord-label" for="scaleYEditor">Y</label><input type="number" id="scaleYEditor" step="0.01" min="0.01" class="editor-input-field"><label class="coord-label" for="scaleZEditor">Z</label><input type="number" id="scaleZEditor" step="0.01" min="0.01" class="editor-input-field"></div>
                        </div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', transformSectionHTML);
            const tProps = ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ'];
            tProps.forEach(p => {
                editorUi[`${p}Input`] = container.querySelector(`#${p}Editor`);
                if (editorUi[`${p}Input`]) editorUi[`${p}Input`].addEventListener('change', handleEditorTransformInputChange);
            });

            const materialSectionHTML = `
                 <div class="section">
                     <h2 class="section-title" data-section="object-material-editor">Material <i class="fas fa-chevron-down"></i></h2>
                     <div class="section-content" id="object-material-editor-content">
                        <div class="property-group">
                            <div class="editor-input-group"><label for="objectColorEditor">Base Color</label><input type="color" id="objectColorEditor" class="editor-input-field"></div>
                            <div class="editor-input-group"><label for="objectEmissiveColorEditor">Emissive</label><input type="color" id="objectEmissiveColorEditor" class="editor-input-field"></div>
                            <div class="editor-input-group"><label for="objectOpacityEditor">Opacity</label><input type="number" id="objectOpacityEditor" step="0.01" min="0" max="1" class="editor-input-field" value="1.00"></div>
                        </div>
                        <div class="property-group">
                            <div class="property-group-title">PBR Properties</div>
                            <div class="editor-input-group"><label for="materialRoughnessEditor">Roughness</label><input type="number" id="materialRoughnessEditor" step="0.01" min="0" max="1" class="editor-input-field"></div>
                            <div class="editor-input-group"><label for="materialMetalnessEditor">Metalness</label><input type="number" id="materialMetalnessEditor" step="0.01" min="0" max="1" class="editor-input-field"></div>
                        </div>
                        <div class="property-group">
                            <div class="property-group-title">Texture Maps (Coming Soon)</div>
                            <div class="texture-slot"><div class="texture-thumbnail">N/A</div><span class="texture-name">Diffuse Map</span><button class="btn btn-secondary btn-sm" disabled>...</button></div>
                            <div class="texture-slot"><div class="texture-thumbnail">N/A</div><span class="texture-name">Normal Map</span><button class="btn btn-secondary btn-sm" disabled>...</button></div>
                            <div class="texture-slot"><div class="texture-thumbnail">N/A</div><span class="texture-name">Roughness Map</span><button class="btn btn-secondary btn-sm" disabled>...</button></div>
                         </div>
                     </div>
                 </div>`;
            container.insertAdjacentHTML('beforeend', materialSectionHTML);
            const mProps = ['objectColor', 'objectEmissiveColor', 'objectOpacity', 'materialRoughness', 'materialMetalness'];
            mProps.forEach(p => {
                editorUi[`${p}Input`] = container.querySelector(`#${p}Editor`);
                 if (editorUi[`${p}Input`]) editorUi[`${p}Input`].addEventListener('change', handleEditorMaterialInputChange);
            });

            // Modifiers Section (Placeholder)
            const modifiersSectionHTML = `
                <div class="section">
                    <h2 class="section-title collapsed" data-section="object-modifiers-editor">Modifiers <i class="fas fa-chevron-down"></i></h2>
                    <div class="section-content collapsed" id="object-modifiers-editor-content">
                        <button class="btn btn-secondary btn-sm w-full" disabled>Add Modifier (e.g., Bend, Array)</button>
                        <p class="helper-text mt-2">Object modifiers coming soon.</p>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', modifiersSectionHTML);


            const actionsDivHTML = `
                <div class="grid grid-cols-2 gap-2 mt-3">
                    <button id="duplicateObjectBtnEditor" class="btn btn-secondary btn-sm"><i class="fas fa-copy"></i> Duplicate</button>
                    <button id="deleteObjectBtnEditor" class="btn btn-danger btn-sm"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>`;
            container.insertAdjacentHTML('beforeend', actionsDivHTML);
            editorUi.duplicateObjectBtn = container.querySelector('#duplicateObjectBtnEditor');
            editorUi.deleteObjectBtn = container.querySelector('#deleteObjectBtnEditor');
            if (editorUi.duplicateObjectBtn) editorUi.duplicateObjectBtn.addEventListener('click', duplicateEditorSelectedObject);
            if (editorUi.deleteObjectBtn) editorUi.deleteObjectBtn.addEventListener('click', deleteEditorSelectedObject);

            container.querySelectorAll('.section-title').forEach(title => title.addEventListener('click', () => toggleEditorSection(title)));

            updateEditorSelectedObjectPropertiesPanel();
        }

        function handleEditorTransformInputChange(e) {
            if (editorSelectedObject && e.target) {
                const propId = e.target.id.replace('Editor', '');
                const value = parseFloat(e.target.value);
                const axis = propId.slice(-1).toLowerCase();
                const type = propId.substring(0, propId.length - 1);

                if (isNaN(value)) {
                    showEditorMessageBox(`Invalid number for ${propId}. Reverting.`, "error");
                    updateEditorSelectedObjectPropertiesPanel();
                    return;
                }

                if (type === 'pos' && editorSelectedObject.position) editorSelectedObject.position[axis] = value;
                else if (type === 'rot' && editorSelectedObject.rotation) editorSelectedObject.rotation[axis] = THREE.MathUtils.degToRad(value);
                else if (type === 'scale' && editorSelectedObject.scale) editorSelectedObject.scale[axis] = Math.max(0.001, value);

                editorSaveState();
            }
        }

        function handleEditorMaterialInputChange(e) {
            if (editorSelectedObject && editorSelectedObject.material && e.target) {
                const material = editorSelectedObject.material;
                const propId = e.target.id.replace('Editor', '');
                let value = (e.target.type === 'color') ? e.target.value : parseFloat(e.target.value);

                if (e.target.type === 'number' && isNaN(value)) {
                    showEditorMessageBox(`Invalid number for ${propId}. Reverting.`, "error");
                    updateEditorSelectedObjectPropertiesPanel();
                    return;
                }

                switch(propId) {
                    case 'objectColor':
                        if (material.color) material.color.set(value).convertSRGBToLinear();
                        break;
                    case 'objectEmissiveColor':
                        if(material.emissive) {
                            material.emissive.set(value).convertSRGBToLinear();
                            if (material.emissive.getHex() !== 0x82aaff) {
                                editorSelectedObject.userData.originalEmissiveHex = material.emissive.getHex();
                            }
                        }
                        break;
                    case 'objectOpacity':
                        if (material.opacity !== undefined) {
                            value = Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
                            material.opacity = value;
                            material.transparent = value < 1; // Enable transparency if opacity is less than 1
                        }
                        break;
                    case 'materialRoughness': if (material.roughness !== undefined) material.roughness = Math.max(0, Math.min(1, value)); break;
                    case 'materialMetalness': if (material.metalness !== undefined) material.metalness = Math.max(0, Math.min(1, value)); break;
                }
                material.needsUpdate = true;
                editorSaveState();
            }
        }

        function switchEditorTab(tabName, sidebarKey) {
            if (!tabName || !sidebarKey) return;
            const tabsContainer = document.getElementById(`${sidebarKey}-sidebar-tabs`);
            const contentContainer = document.getElementById(`${sidebarKey}-sidebar-content`);
            if(!tabsContainer || !contentContainer) {
                console.warn(`Sidebar tabs or content container not found for ${sidebarKey}`);
                return;
            }

            tabsContainer.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            contentContainer.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            const selectedTabButton = tabsContainer.querySelector(`.sidebar-tab[data-tab="${tabName}"]`);
            const selectedPanelElement = contentContainer.querySelector(`#${tabName}`);
            if (selectedTabButton) selectedTabButton.classList.add('active');
            if (selectedPanelElement) selectedPanelElement.classList.add('active');

            if (sidebarKey === 'right' && tabName === 'selection-props-panel') {
                updateEditorSelectionPropertiesVisibility();
            }
        }

        function toggleEditorSection(titleElement) {
            if (!titleElement || !titleElement.dataset || !titleElement.dataset.section) return;
            const sectionId = titleElement.dataset.section;
            const contentElement = document.getElementById(`${sectionId}-content`);
            if (contentElement) {
                 titleElement.classList.toggle('collapsed');
                 contentElement.classList.toggle('collapsed');
            }
        }

        function editorAddObject(geometry, baseType = 'Object', materialOptions = {}) {
            if (!editorScene || !isEditorInitialized) {
                showEditorMessageBox("Editor not ready to add objects.", "error");
                return null;
            }
            const defaultMaterial = { color: new THREE.Color(0xcccccc), roughness: 0.6, metalness: 0.2, transparent: false, opacity: 1 };
            const finalMaterialOptions = { ...defaultMaterial, ...materialOptions };
            const material = new THREE.MeshStandardMaterial(finalMaterialOptions);
            material.color.convertSRGBToLinear();
            if(material.emissive) material.emissive.convertSRGBToLinear();

            const object = new THREE.Mesh(geometry, material);
            object.name = `${baseType}_${editorObjects.length + 1}`;
            object.userData.type = baseType.split(' ')[0];
            object.castShadow = true;
            object.receiveShadow = true;

            editorScene.add(object);
            editorObjects.push(object);

            editorSelectObject(object);
            updateEditorObjectList();
            showEditorMessageBox(`Added ${object.name}.`, "success", 1500);
            return object;
        }

        function editorAddLightObject(type) {
            if (!editorScene || !isEditorInitialized) {
                 showEditorMessageBox("Editor not ready to add lights.", "error");
                return null;
            }
            let light, helper;
            const lightColor = 0xfff5e0;
            const L_HELPER_COLORS = {'Point':0xffff00, 'Directional':0x00ff00, 'Spot':0xff0000, 'Ambient': 0x888888};

            switch (type) {
                case 'Point':
                    light = new THREE.PointLight(lightColor, 1, 50, 1.5);
                    light.position.set(2,3,2);
                    helper = new THREE.PointLightHelper(light, 0.5, L_HELPER_COLORS[type]);
                    break;
                case 'Directional':
                    light = new THREE.DirectionalLight(lightColor, 0.8);
                    light.position.set(5,10,7.5);
                    light.target.position.set(0,0,0);
                    editorScene.add(light.target);
                    helper = new THREE.DirectionalLightHelper(light, 1, L_HELPER_COLORS[type]);
                    break;
                case 'Spot':
                    light = new THREE.SpotLight(lightColor, 1, 70, Math.PI/4, 0.3, 1.5);
                    light.position.set(0,5,3);
                    light.target.position.set(0,0,0);
                    editorScene.add(light.target);
                    helper = new THREE.SpotLightHelper(light, L_HELPER_COLORS[type]);
                    break;
                case 'Ambient':
                    light = new THREE.AmbientLight(lightColor, 0.3);
                    break;
                default:
                    console.warn("Unknown light type requested:", type);
                    return null;
            }

            light.name = `${type}Light_${editorLights.filter(l => l.userData.type === type).length + 1}`;
            light.userData.type = type;
            light.castShadow = (type === 'Directional' || type === 'Spot' || type === 'Point');

            if (light.shadow && light.castShadow) {
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
            }

            editorScene.add(light);
            if (helper) {
                light.userData.helper = helper;
                editorScene.add(helper);
                helper.visible = true;
            }

            editorLights.push(light);
            editorSelectLight(light);
            updateEditorObjectList();
            showEditorMessageBox(`Added ${type} Light.`, "success", 1500);
            editorSaveState();
            return light;
        }

        function onEditorCanvasClick(event) {
            if (!isEditorInitialized || !editorRenderer || !editorRaycaster || !editorMouse || !editorCamera || (editorTransformControls && editorTransformControls.dragging)) return;

            const canvas = editorRenderer.domElement;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            editorRaycaster.setFromCamera(editorMouse, editorCamera);

            if (isDrawingRectangle) {
                const intersection = new THREE.Vector3();
                editorRaycaster.ray.intersectPlane(groundPlane, intersection);

                if (!rectangleStartPoint) {
                    rectangleStartPoint = intersection.clone();
                    const previewMaterial = new THREE.LineBasicMaterial({ color: 0x82aaff, transparent: true, opacity: 0.7 });
                    const previewGeometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
                    ]);
                    rectanglePreviewMesh = new THREE.Line(previewGeometry, previewMaterial);
                    rectanglePreviewMesh.name = "RectanglePreview";
                    editorScene.add(rectanglePreviewMesh);
                    showEditorMessageBox("Move mouse to define size, click to set second corner.", "info");
                } else {
                    const width = Math.abs(intersection.x - rectangleStartPoint.x);
                    const depth = Math.abs(intersection.z - rectangleStartPoint.z);
                    if (width > 0.01 && depth > 0.01) {
                        const centerX = (rectangleStartPoint.x + intersection.x) / 2;
                        const centerZ = (rectangleStartPoint.z + intersection.z) / 2;

                        const rectGeo = new THREE.PlaneGeometry(width, depth);
                        const rectMesh = editorAddObject(rectGeo, "Rectangle");
                        if (rectMesh) {
                            rectMesh.rotation.x = -Math.PI / 2;
                            rectMesh.position.set(centerX, 0, centerZ);
                        }
                        editorSaveState();
                    } else {
                        showEditorMessageBox("Rectangle too small, drawing cancelled.", "error", 2000);
                    }
                    cancelActiveToolModes();
                }
                return;
            }

            if (isPushPullMode) {
                const intersects = editorRaycaster.intersectObjects(editorObjects, false);
                if (intersects.length > 0) {
                    const clickedObject = intersects[0].object;
                    if (clickedObject.geometry && (clickedObject.geometry.type === 'PlaneGeometry' || clickedObject.geometry.type === 'BoxGeometry')) {
                        objectToPushPull = clickedObject;
                        pushPullFaceNormal = intersects[0].face.normal.clone();
                        pushPullFaceIndex = intersects[0].faceIndex;

                        if (editorUi.extrusionModalOverlayEditor && editorUi.extrusionHeightInput) {
                            editorUi.extrusionHeightInput.value = 1;
                            editorUi.extrusionModalOverlayEditor.classList.add('show');
                            editorUi.extrusionHeightInput.focus();
                        } else {
                            showEditorMessageBox("Extrusion UI not found.", "error");
                            cancelActiveToolModes();
                        }
                    } else {
                        showEditorMessageBox("Push/Pull currently works on flat planes or box faces.", "info");
                    }
                } else {
                    showEditorMessageBox("No suitable object found for Push/Pull. Click on a plane or box.", "info");
                }
                return;
            }


            const intersectsMeshes = editorRaycaster.intersectObjects(editorObjects, false);
            if (intersectsMeshes.length > 0) {
                const firstIntersected = intersectsMeshes[0].object;
                if (editorSelectedObject !== firstIntersected) editorSelectObject(firstIntersected);
                editorSelectLight(null);
                switchEditorTab('selection-props-panel', 'right');
                return;
            }

            const lightHelpers = editorLights.map(l => l.userData.helper).filter(h => h && h.visible);
            const intersectsLights = editorRaycaster.intersectObjects(lightHelpers, false);
            if (intersectsLights.length > 0) {
                const firstHelper = intersectsLights[0].object;
                const correspondingLight = editorLights.find(l => l.userData.helper === firstHelper);
                if (correspondingLight) {
                    editorSelectLight(correspondingLight);
                    editorSelectObject(null);
                    switchEditorTab('selection-props-panel', 'right');
                }
                return;
            }

            editorSelectObject(null);
            editorSelectLight(null);
        }

        function onEditorCanvasMouseMove(event) {
            if (!isEditorInitialized || !isDrawingRectangle || !rectangleStartPoint || !rectanglePreviewMesh) return;
            if (!editorRaycaster || !editorMouse || !editorCamera) return;

            const canvas = editorRenderer.domElement;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            editorMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            editorMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            editorRaycaster.setFromCamera(editorMouse, editorCamera);

            const intersection = new THREE.Vector3();
            editorRaycaster.ray.intersectPlane(groundPlane, intersection);

            const p1 = rectangleStartPoint;
            const p2 = intersection;
            const points = [
                p1.x, 0.01, p1.z,
                p2.x, 0.01, p1.z,
                p2.x, 0.01, p2.z,
                p1.x, 0.01, p2.z,
                p1.x, 0.01, p1.z
            ];
            rectanglePreviewMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
            rectanglePreviewMesh.geometry.attributes.position.needsUpdate = true;
            rectanglePreviewMesh.geometry.computeBoundingSphere();
        }

        function onEditorKeyDown(event) {
            if (!isEditorInitialized) return;
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
                if (event.key === 'Escape') activeElement.blur();
                return;
            }

            if (event.key === 'Escape') {
                if (isDrawingRectangle || isPushPullMode) {
                    cancelActiveToolModes();
                    return;
                }
            }

            const isCtrlCmd = event.ctrlKey || event.metaKey;

            if (isCtrlCmd && event.key.toLowerCase() === 's') { event.preventDefault(); if (editorUi.saveProjectBtn) editorUi.saveProjectBtn.click(); }
            if (isCtrlCmd && event.key.toLowerCase() === 'z') { event.preventDefault(); editorUndo(); }
            if (isCtrlCmd && event.key.toLowerCase() === 'y') { event.preventDefault(); editorRedo(); }

            if (editorSelectedObject || editorSelectedLight || event.key.toLowerCase() === 'escape') {
                 switch (event.key.toLowerCase()) {
                    case 't': setEditorTransformMode('translate'); break;
                    case 'r': setEditorTransformMode('rotate'); break;
                    case 's': setEditorTransformMode('scale'); break;
                    case 'escape': editorSelectObject(null); editorSelectLight(null); break;
                    case 'delete': case 'backspace':
                        if (editorSelectedObject) deleteEditorSelectedObject();
                        else if (editorSelectedLight) deleteEditorSelectedLight();
                        break;
                    case 'f': if (editorSelectedObject && editorUi.viewFrameBtn) frameEditorSelectedObject(); break;
                }
            }

            if (!isCtrlCmd) {
                switch (event.key) {
                    case '7': case 'Home': setEditorCameraView('top'); break;
                    case '1': case 'End': setEditorCameraView('front'); break;
                    case '3': case 'PageDown': setEditorCameraView('side'); break;
                    case '5': setEditorCameraView('iso'); break;
                    case 'x': toggleEditorSnapping(); break;
                }
            }
        }

        function editorSelectObject(object) {
            if (!editorTransformControls) return;
            if (editorSelectedObject && editorSelectedObject.material && editorSelectedObject.material.emissive) {
                 editorSelectedObject.material.emissive.setHex(editorSelectedObject.userData.originalEmissiveHex === undefined ? 0x000000 : editorSelectedObject.userData.originalEmissiveHex);
                 editorSelectedObject.material.needsUpdate = true;
            }

            if (editorTransformControls.object) editorTransformControls.detach();

            editorSelectedObject = object;
            editorSelectedLight = null;

            if (editorSelectedObject) {
                if (editorSelectedObject.material && editorSelectedObject.material.emissive) {
                    editorSelectedObject.userData.originalEmissiveHex = editorSelectedObject.material.emissive.getHex();
                    editorSelectedObject.material.emissive.setHex(0x82aaff);
                    editorSelectedObject.material.needsUpdate = true;
                }
                editorTransformControls.attach(editorSelectedObject);
                populateObjectPropertiesPanel(editorSelectedObject);
                if(editorTransformControls.mode) updateEditorTransformModeButtons(editorTransformControls.mode);
            } else {
                if(editorUi.objectPropertiesContainer) editorUi.objectPropertiesContainer.innerHTML = '';
            }

            updateEditorSelectionPropertiesVisibility();
            updateEditorObjectList();
        }

        function editorSelectLight(light) {
            if (!editorTransformControls) return;
            const L_HELPER_COLORS = {'Point':0xffff00, 'Directional':0x00ff00, 'Spot':0xff0000, 'Ambient': 0x888888};
            if (editorSelectedLight && editorSelectedLight.userData && editorSelectedLight.userData.helper && editorSelectedLight.userData.helper.material) {
                const L_TYPE = editorSelectedLight.userData.type;
                if(L_TYPE && L_HELPER_COLORS[L_TYPE]) {
                    editorSelectedLight.userData.helper.material.color.setHex(L_HELPER_COLORS[L_TYPE]);
                }
            }

            if (editorTransformControls.object) editorTransformControls.detach();

            editorSelectedLight = light;
            editorSelectedObject = null;

            if (editorSelectedLight) {
                if (editorSelectedLight.userData && editorSelectedLight.userData.helper && editorSelectedLight.userData.helper.material) {
                     editorSelectedLight.userData.helper.material.color.setHex(0x82aaff);
                }
                if (editorSelectedLight.position) {
                    editorTransformControls.attach(editorSelectedLight);
                    if(editorTransformControls.mode) updateEditorTransformModeButtons(editorTransformControls.mode);
                }
                updateEditorSelectedLightPropertiesPanel();
            }

            updateEditorSelectionPropertiesVisibility();
            updateEditorObjectList();
        }

        function updateEditorSelectionPropertiesVisibility() {
            const hasObjectSelection = !!editorSelectedObject;
            const hasLightSelection = !!editorSelectedLight;

            if(editorUi.objectPropertiesContainer) editorUi.objectPropertiesContainer.style.display = hasObjectSelection ? 'block' : 'none';
            if(editorUi.lightPropertiesDisplayContainer) editorUi.lightPropertiesDisplayContainer.style.display = hasLightSelection ? 'block' : 'none';
            if(editorUi.noSelectionMessage) editorUi.noSelectionMessage.style.display = (!hasObjectSelection && !hasLightSelection) ? 'block' : 'none';
        }

        function updateEditorSelectedObjectPropertiesPanel() {
            if (editorSelectedObject && editorUi.objectNameInput) {
                editorUi.objectNameInput.value = editorSelectedObject.name || '';

                if (editorSelectedObject.position) {
                    if (editorUi.posXInput) editorUi.posXInput.value = editorSelectedObject.position.x.toFixed(3);
                    if (editorUi.posYInput) editorUi.posYInput.value = editorSelectedObject.position.y.toFixed(3);
                    if (editorUi.posZInput) editorUi.posZInput.value = editorSelectedObject.position.z.toFixed(3);
                }
                if (editorSelectedObject.rotation) {
                    if (editorUi.rotXInput) editorUi.rotXInput.value = THREE.MathUtils.radToDeg(editorSelectedObject.rotation.x).toFixed(1);
                    if (editorUi.rotYInput) editorUi.rotYInput.value = THREE.MathUtils.radToDeg(editorSelectedObject.rotation.y).toFixed(1);
                    if (editorUi.rotZInput) editorUi.rotZInput.value = THREE.MathUtils.radToDeg(editorSelectedObject.rotation.z).toFixed(1);
                }
                if (editorSelectedObject.scale) {
                    if (editorUi.scaleXInput) editorUi.scaleXInput.value = editorSelectedObject.scale.x.toFixed(3);
                    if (editorUi.scaleYInput) editorUi.scaleYInput.value = editorSelectedObject.scale.y.toFixed(3);
                    if (editorUi.scaleZInput) editorUi.scaleZInput.value = editorSelectedObject.scale.z.toFixed(3);
                }

                const box = new THREE.Box3().setFromObject(editorSelectedObject);
                const size = new THREE.Vector3();
                box.getSize(size);
                if(editorUi.dimXInput) editorUi.dimXInput.value = size.x.toFixed(3);
                if(editorUi.dimYInput) editorUi.dimYInput.value = size.y.toFixed(3);
                if(editorUi.dimZInput) editorUi.dimZInput.value = size.z.toFixed(3);

                if (editorSelectedObject.material) {
                    const material = editorSelectedObject.material;
                    if(editorUi.objectColorInput && material.color) editorUi.objectColorInput.value = `#${material.color.clone().convertLinearToSRGB().getHexString()}`;

                    const emissiveColor = (material.emissive && material.emissive.getHex() === 0x82aaff && editorSelectedObject.userData.originalEmissiveHex !== undefined)
                                        ? new THREE.Color(editorSelectedObject.userData.originalEmissiveHex)
                                        : (material.emissive || new THREE.Color(0x000000));
                    if(editorUi.objectEmissiveColorInput) editorUi.objectEmissiveColorInput.value = `#${emissiveColor.clone().convertLinearToSRGB().getHexString()}`;
                    if(editorUi.objectOpacityInput && material.opacity !== undefined) editorUi.objectOpacityInput.value = material.opacity.toFixed(2);

                    if(editorUi.materialRoughnessInput && material.roughness !== undefined) editorUi.materialRoughnessInput.value = material.roughness.toFixed(2);
                    if(editorUi.materialMetalnessInput && material.metalness !== undefined) editorUi.materialMetalnessInput.value = material.metalness.toFixed(2);
                }
            }
        }

        function updateEditorSelectedLightPropertiesPanel() {
            if (editorSelectedLight) {
                if (editorUi.lightNameInput) editorUi.lightNameInput.value = editorSelectedLight.name || '';
                if (editorUi.lightColorInput && editorSelectedLight.color) editorUi.lightColorInput.value = `#${editorSelectedLight.color.getHexString()}`;
                if (editorUi.lightIntensityInput && editorSelectedLight.intensity !== undefined) editorUi.lightIntensityInput.value = editorSelectedLight.intensity.toFixed(2);

                const isPointOrSpot = editorSelectedLight.isPointLight || editorSelectedLight.isSpotLight;
                if (editorUi.lightDistanceGroup) editorUi.lightDistanceGroup.classList.toggle('hidden', !isPointOrSpot);
                if (editorUi.lightDecayGroup) editorUi.lightDecayGroup.classList.toggle('hidden', !isPointOrSpot);
                if (isPointOrSpot) {
                    if (editorUi.lightDistanceInput && editorSelectedLight.distance !== undefined) editorUi.lightDistanceInput.value = editorSelectedLight.distance.toFixed(1);
                    if (editorUi.lightDecayInput && editorSelectedLight.decay !== undefined) editorUi.lightDecayInput.value = editorSelectedLight.decay.toFixed(1);
                }

                const isSpot = editorSelectedLight.isSpotLight;
                if (editorUi.lightAngleGroup) editorUi.lightAngleGroup.classList.toggle('hidden', !isSpot);
                if (editorUi.lightPenumbraGroup) editorUi.lightPenumbraGroup.classList.toggle('hidden', !isSpot);
                if (isSpot) {
                    if (editorUi.lightAngleInput && editorSelectedLight.angle !== undefined) editorUi.lightAngleInput.value = THREE.MathUtils.radToDeg(editorSelectedLight.angle).toFixed(1);
                    if (editorUi.lightPenumbraInput && editorSelectedLight.penumbra !== undefined) editorUi.lightPenumbraInput.value = editorSelectedLight.penumbra.toFixed(2);
                }
            }
        }

        function updateEditorObjectList() {
            if (!editorUi.objectListPanel) return;
            editorUi.objectListPanel.innerHTML = '';

            const allElements = [
                ...editorObjects, ...editorLights,
                ...(editorDefaultAmbientLight ? [editorDefaultAmbientLight] : []),
                ...(editorDefaultDirectionalLight ? [editorDefaultDirectionalLight] : [])
            ].filter(Boolean);

            if (allElements.length === 0) {
                editorUi.objectListPanel.innerHTML = '<p class="helper-text">Scene is empty.</p>';
                return;
            }

            allElements.forEach(element => {
                if (!element || !element.name) return;

                const listItem = document.createElement('div');
                listItem.className = 'object-list-item';
                listItem.dataset.uuid = element.uuid;

                let iconClass = 'fas fa-question-circle';
                if (element.isLight || element.isAmbientLight || element.isDirectionalLight || element.isPointLight || element.isSpotLight) {
                    const type = element.userData.type || (element.isAmbientLight ? 'Ambient' : (element.isDirectionalLight ? 'Directional' : (element.isPointLight ? 'Point' : (element.isSpotLight ? 'Spot' : 'Light'))));
                    switch (type) {
                        case 'Point': iconClass = 'fas fa-lightbulb'; break;
                        case 'Directional': iconClass = 'fas fa-sun'; break;
                        case 'Spot': iconClass = 'fas fa-video'; break;
                        case 'Ambient': iconClass = 'fas fa-cloud-sun'; break;
                    }
                } else if (element.isMesh) {
                    switch (element.userData.type) {
                        case 'Cube': case 'Box': iconClass = 'fas fa-cube'; break;
                        case 'Sphere': iconClass = 'fas fa-globe'; break;
                        case 'Cylinder': iconClass = 'fas fa-circle-notch'; break;
                        case 'Plane': iconClass = 'far fa-square'; break;
                        case 'Rectangle': iconClass = 'far fa-vector-square'; break;
                        case 'Wall': iconClass = 'fas fa-ruler-combined'; break;
                        case 'Slab': iconClass = 'fas fa-layer-group'; break;
                        case 'ExtrudedSlab': case 'ExtrudedBox': iconClass = 'fas fa-draw-polygon'; break;
                        default: iconClass = 'fas fa-shapes'; break;
                    }
                }
                listItem.innerHTML = `<i class="${iconClass} mr-2"></i> <span class="flex-grow truncate" title="${element.name}">${element.name}</span>`;

                if (element === editorSelectedObject || element === editorSelectedLight) {
                    listItem.classList.add('selected');
                }

                listItem.addEventListener('click', () => {
                    cancelActiveToolModes();
                    if (editorObjects.includes(element)) {
                        editorSelectObject(element);
                        switchEditorTab('selection-props-panel', 'right');
                    } else if (editorLights.includes(element)) {
                        editorSelectLight(element);
                        switchEditorTab('selection-props-panel', 'right');
                    } else if (element === editorDefaultAmbientLight || element === editorDefaultDirectionalLight) {
                        editorSelectLight(null); editorSelectObject(null);
                        switchEditorTab('environment-panel', 'right');
                        showEditorMessageBox(`${element.name} properties are in the World panel.`, 'info');
                    }
                });
                editorUi.objectListPanel.appendChild(listItem);
            });
        }

        function editorGetCurrentSceneState() {
            if (!editorCamera || !editorOrbitControls || !editorScene || !editorDefaultAmbientLight) {
                console.warn("Cannot get current scene state: essential components missing.");
                return getInitialSceneState();
            }
            return {
                objects: editorObjects.map(o => ({
                    uuid: o.uuid, name: o.name, type: o.userData.type,
                    geometryType: o.geometry.type, geometryParams: o.geometry.parameters,
                    position: o.position.toArray(), rotation: o.rotation.toArray(), scale: o.scale.toArray(),
                    material: {
                        color: `#${o.material.color.clone().convertLinearToSRGB().getHexString()}`,
                        emissive: `#${(o.material.emissive ? o.material.emissive.clone().convertLinearToSRGB() : new THREE.Color(0x000000)).getHexString()}`,
                        roughness: o.material.roughness, metalness: o.material.metalness,
                        opacity: o.material.opacity, transparent: o.material.transparent
                    }
                })),
                lights: editorLights.map(l => ({
                    uuid: l.uuid, name: l.name, type: l.userData.type,
                    position: l.position ? l.position.toArray() : null,
                    targetPosition: (l.target && l.target.position) ? l.target.position.toArray() : null,
                    color: `#${l.color.getHexString()}`, intensity: l.intensity,
                    distance: l.distance, decay: l.decay, angle: l.angle, penumbra: l.penumbra
                })),
                camera: {
                    position: editorCamera.position.toArray(), target: editorOrbitControls.target.toArray(),
                    fov: editorCamera.fov, near: editorCamera.near, far: editorCamera.far
                },
                sceneBgColor: editorScene.background.getHexString(),
                defaultAmbientLightColor: editorDefaultAmbientLight.color.getHexString(),
                defaultAmbientLightIntensity: editorDefaultAmbientLight.intensity,
            };
        }

        function editorSaveState(addToHistory = true) {
            if (!isEditorInitialized) return;

            const currentStateString = JSON.stringify(editorGetCurrentSceneState());

            if (!addToHistory) {
                editorHistory.length = 0;
                editorHistory.push(currentStateString);
                editorHistoryIndex = 0;
                updateEditorUndoRedoButtons();
                return;
            }

            if (editorHistoryIndex < editorHistory.length - 1) {
                editorHistory.splice(editorHistoryIndex + 1);
            }

            if (editorHistory.length > 0 && editorHistory[editorHistoryIndex] === currentStateString) {
                updateEditorUndoRedoButtons();
                return;
            }

            editorHistory.push(currentStateString);

            if (editorHistory.length > EDITOR_MAX_HISTORY_STATES) {
                editorHistory.shift();
            }
            editorHistoryIndex = editorHistory.length - 1;

            updateEditorUndoRedoButtons();
        }

        function editorApplyState(stateString) {
            if (!isEditorInitialized || !editorScene || !editorCamera || !editorOrbitControls || !editorDefaultAmbientLight ||
                !editorUi.cameraFOVInput || !editorUi.cameraNearInput || !editorUi.cameraFarInput ||
                !editorUi.sceneBgColorInput || !editorUi.ambientLightColorInput || !editorUi.ambientLightIntensityInput) {
                console.error("Cannot apply state: Essential editor components or UI elements are not initialized.");
                showEditorMessageBox("Error applying scene state: Editor not fully initialized.", "error");
                return;
            }

            let state;
            try {
                state = JSON.parse(stateString);
            } catch (e) {
                console.error("Error parsing scene state:", e, stateString);
                showEditorMessageBox("Error loading scene state. Data might be corrupted.", "error");
                return;
            }

            editorSelectObject(null); editorSelectLight(null);

            while(editorObjects.length > 0) {
                const o = editorObjects.pop();
                if (editorTransformControls && editorTransformControls.object === o) editorTransformControls.detach();
                editorScene.remove(o);
                if(o.geometry) o.geometry.dispose();
                if(o.material) o.material.dispose();
            }

            while(editorLights.length > 0) {
                const l = editorLights.pop();
                if (l.userData.helper) { editorScene.remove(l.userData.helper); if(l.userData.helper.dispose) l.userData.helper.dispose(); }
                if (l.target && l.target.parent === editorScene) editorScene.remove(l.target);
                editorScene.remove(l);
                if(l.dispose) l.dispose();
            }

            if (state.objects && Array.isArray(state.objects)) {
                state.objects.forEach(d => {
                    let geo;
                    try {
                        const params = (d.geometryParams && typeof d.geometryParams === 'object') ? d.geometryParams : {};
                        switch (d.geometryType) {
                            case 'BoxGeometry': geo = new THREE.BoxGeometry(params.width || 1, params.height || 1, params.depth || 1); break;
                            case 'SphereGeometry': geo = new THREE.SphereGeometry(params.radius || 0.75, params.widthSegments || 32, params.heightSegments || 16); break;
                            case 'CylinderGeometry': geo = new THREE.CylinderGeometry(params.radiusTop || 0.5, params.radiusBottom || 0.5, params.height || 1.5, params.radialSegments || 32); break;
                            case 'PlaneGeometry': geo = new THREE.PlaneGeometry(params.width || 10, params.height || 10); break;
                            default: console.warn("Unknown geometry type in state:", d.geometryType); geo = new THREE.BoxGeometry(1,1,1); break;
                        }
                        const matData = d.material || {};
                        const mat = new THREE.MeshStandardMaterial({
                            color: new THREE.Color(matData.color || '#cccccc'),
                            emissive: new THREE.Color(matData.emissive || '#000000'),
                            roughness: matData.roughness !== undefined ? matData.roughness : 0.6,
                            metalness: matData.metalness !== undefined ? matData.metalness : 0.2,
                            opacity: matData.opacity !== undefined ? matData.opacity : 1.0,
                            transparent: matData.transparent !== undefined ? matData.transparent : (matData.opacity !== undefined ? matData.opacity < 1.0 : false)
                        });
                        mat.color.convertSRGBToLinear();
                        if(mat.emissive) mat.emissive.convertSRGBToLinear();

                        const o = new THREE.Mesh(geo, mat);
                        o.uuid = d.uuid || THREE.MathUtils.generateUUID();
                        o.name = d.name || 'Object';
                        o.userData.type = d.type || 'Object';
                        if(d.position) o.position.fromArray(d.position);
                        if(d.rotation) o.rotation.fromArray(d.rotation);
                        if(d.scale) o.scale.fromArray(d.scale);
                        o.castShadow = true; o.receiveShadow = true;
                        editorScene.add(o); editorObjects.push(o);
                    } catch (geoError) {
                        console.error("Error creating geometry/material for object:", d.name, geoError);
                    }
                });
            }
            if (state.lights && Array.isArray(state.lights)) {
                state.lights.forEach(d => {
                    let l, h; const c = new THREE.Color(d.color || '#ffffff');
                    const L_HELPER_COLORS = {'Point':0xffff00, 'Directional':0x00ff00, 'Spot':0xff0000};
                    try {
                        switch (d.type) {
                            case 'Point': l = new THREE.PointLight(c, d.intensity, d.distance, d.decay); if(d.position) l.position.fromArray(d.position); h = new THREE.PointLightHelper(l,0.5, L_HELPER_COLORS[d.type]); break;
                            case 'Directional': l = new THREE.DirectionalLight(c,d.intensity); if(d.position) l.position.fromArray(d.position); if(d.targetPosition && l.target) l.target.position.fromArray(d.targetPosition); else if(l.target) l.target.position.set(0,0,0); if(l.target) editorScene.add(l.target); h = new THREE.DirectionalLightHelper(l,1, L_HELPER_COLORS[d.type]); break;
                            case 'Spot': l = new THREE.SpotLight(c,d.intensity,d.distance,d.angle,d.penumbra,d.decay); if(d.position) l.position.fromArray(d.position); if(d.targetPosition && l.target) l.target.position.fromArray(d.targetPosition); else if(l.target) l.target.position.set(0,0,0); if(l.target) editorScene.add(l.target); h = new THREE.SpotLightHelper(l, L_HELPER_COLORS[d.type]); break;
                            case 'Ambient': l = new THREE.AmbientLight(c,d.intensity); break;
                            default: console.warn("Unknown light type in state:", d.type); break;
                        }
                        if (l) {
                            l.uuid = d.uuid || THREE.MathUtils.generateUUID();
                            l.name = d.name || 'Light';
                            l.userData.type = d.type;
                            l.castShadow = (d.type !== 'Ambient');
                            if(l.shadow && l.castShadow){l.shadow.mapSize.width=1024; l.shadow.mapSize.height=1024;}
                            editorScene.add(l);
                            if(h){l.userData.helper=h; editorScene.add(h); h.visible = true;}
                            editorLights.push(l);
                        }
                    } catch (lightError) {
                        console.error("Error creating light:", d.name, lightError);
                    }
                });
            }
            if(state.camera){
                editorCamera.position.fromArray(state.camera.position);
                editorOrbitControls.target.fromArray(state.camera.target);
                editorCamera.fov = state.camera.fov;
                editorCamera.near = state.camera.near;
                editorCamera.far = state.camera.far;
                editorCamera.updateProjectionMatrix();
                editorOrbitControls.update();
                editorUi.cameraFOVInput.value = editorCamera.fov;
                editorUi.cameraNearInput.value = editorCamera.near;
                editorUi.cameraFarInput.value = editorCamera.far;
            }
            if(state.sceneBgColor && editorScene.background){
                editorScene.background.setHex(parseInt(state.sceneBgColor,16));
                editorUi.sceneBgColorInput.value = `#${state.sceneBgColor}`;
            }
            if(state.defaultAmbientLightColor && state.defaultAmbientLightIntensity !== undefined && editorDefaultAmbientLight){
                editorDefaultAmbientLight.color.setHex(parseInt(state.defaultAmbientLightColor,16));
                editorDefaultAmbientLight.intensity = state.defaultAmbientLightIntensity;
                editorUi.ambientLightColorInput.value = `#${state.defaultAmbientLightColor}`;
                editorUi.ambientLightIntensityInput.value = state.defaultAmbientLightIntensity;
            }
            updateEditorObjectList();
            updateEditorUndoRedoButtons();
        }

        function updateEditorUndoRedoButtons() {
            if (editorUi.undoBtn) editorUi.undoBtn.disabled = editorHistoryIndex <= 0;
            if (editorUi.redoBtn) editorUi.redoBtn.disabled = editorHistoryIndex >= editorHistory.length - 1;
        }

        function setEditorTransformMode(mode) {
            if (editorTransformControls) {
                cancelActiveToolModes();
                editorTransformControls.setMode(mode);
                updateEditorTransformModeButtons(mode);
            }
        }

        function updateEditorTransformModeButtons(activeMode) {
            if (editorUi.viewTranslateBtn) editorUi.viewTranslateBtn.classList.toggle('active', activeMode === 'translate');
            if (editorUi.viewRotateBtn) editorUi.viewRotateBtn.classList.toggle('active', activeMode === 'rotate');
            if (editorUi.viewScaleBtn) editorUi.viewScaleBtn.classList.toggle('active', activeMode === 'scale');
        }

        function setEditorCameraView(type) {
            if (!editorCamera || !editorOrbitControls) return;
            cancelActiveToolModes();
            const target = editorSelectedObject ? new THREE.Box3().setFromObject(editorSelectedObject).getCenter(new THREE.Vector3()) : editorOrbitControls.target.clone();
            let position = new THREE.Vector3();
            const boundingSphere = editorSelectedObject ? new THREE.Box3().setFromObject(editorSelectedObject).getBoundingSphere(new THREE.Sphere()) : null;
            const distance = boundingSphere ? Math.max(1, boundingSphere.radius) * 5 + 2 : 10;

            switch(type) {
                case 'top': position.set(target.x, target.y + distance, target.z + 0.001); editorCamera.up.set(0,1,0); break;
                case 'front': position.set(target.x, target.y, target.z + distance); editorCamera.up.set(0,1,0); break;
                case 'side': position.set(target.x + distance, target.y, target.z); editorCamera.up.set(0,1,0); break;
                case 'iso': position.set(target.x + distance*0.707, target.y + distance*0.707, target.z + distance*0.707); editorCamera.up.set(0,1,0); break;
            }
            editorCamera.position.copy(position);
            editorCamera.lookAt(target);
            editorOrbitControls.target.copy(target);
            editorOrbitControls.update();
            showEditorMessageBox(`${type.charAt(0).toUpperCase() + type.slice(1)} View`, 'info', 1000);
        }

        function showEditorExportSceneDialog() {
            if (!editorUi.jsonOutputEditor || !editorUi.jsonBoxEditorTitle || !editorUi.loadJsonEditorBtn || !editorUi.copyJsonEditorBtn || !editorUi.jsonMessageBoxEditor) return;
            if (editorHistory.length === 0 || editorHistoryIndex < 0 || !editorHistory[editorHistoryIndex]) {
                showEditorMessageBox("Nothing to export. Scene is empty or no history.", "info");
                return;
            }
            editorUi.jsonOutputEditor.value = editorHistory[editorHistoryIndex];
            editorUi.jsonOutputEditor.readOnly = true;
            editorUi.jsonBoxEditorTitle.textContent = "Export Scene (Copy JSON)";
            editorUi.loadJsonEditorBtn.classList.add('hidden');
            editorUi.copyJsonEditorBtn.classList.remove('hidden');
            editorUi.jsonMessageBoxEditor.classList.add('show');
            editorUi.jsonOutputEditor.select();
        }

        function showEditorImportSceneDialog() {
            if (!editorUi.jsonOutputEditor || !editorUi.jsonBoxEditorTitle || !editorUi.loadJsonEditorBtn || !editorUi.copyJsonEditorBtn || !editorUi.jsonMessageBoxEditor) return;
            editorUi.jsonOutputEditor.value = "";
            editorUi.jsonOutputEditor.readOnly = false;
            editorUi.jsonBoxEditorTitle.textContent = "Import Scene (Paste JSON to Replace Current)";
            editorUi.loadJsonEditorBtn.classList.remove('hidden');
            editorUi.copyJsonEditorBtn.classList.add('hidden');
            editorUi.jsonMessageBoxEditor.classList.add('show');
            editorUi.jsonOutputEditor.focus();
        }

        function copyEditorJsonToClipboard() {
            if (!editorUi.jsonOutputEditor) return;
            if (editorUi.jsonOutputEditor.value) {
                const ta = document.createElement('textarea');
                ta.value = editorUi.jsonOutputEditor.value;
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand('copy');
                    showEditorMessageBox("Scene JSON copied!", "success");
                } catch (err) {
                    showEditorMessageBox("Failed to copy JSON. Please copy manually.", "error");
                    console.error("Copy to clipboard failed:", err);
                }
                document.body.removeChild(ta);
            } else {
                showEditorMessageBox("No JSON to copy.", "error");
            }
        }

        function loadEditorSceneFromJsonInput() {
            if (!editorUi.jsonOutputEditor || !editorUi.jsonMessageBoxEditor) return;
            const jsonString = editorUi.jsonOutputEditor.value;
            if (!jsonString.trim()) {
                showEditorMessageBox("No JSON data pasted.", "error");
                return;
            }
            try {
                JSON.parse(jsonString);
                showEditorConfirmModal("Replace current scene with this JSON data? Unsaved changes will be lost.", (confirmed) => {
                    if (confirmed) {
                        editorHistory.length = 0; editorHistoryIndex = -1;
                        editorApplyState(jsonString);
                        editorSaveState(false);
                        editorUi.jsonMessageBoxEditor.classList.remove('show');
                        showEditorMessageBox("Scene loaded from JSON!", "success");
                    }
                });
            } catch (error) {
                showEditorMessageBox("Invalid JSON data. Please check the format.", "error");
                console.error("Invalid JSON for import:", error);
            }
        }

        function editorUndo() { if (editorHistoryIndex > 0) { editorHistoryIndex--; editorApplyState(editorHistory[editorHistoryIndex]); showEditorMessageBox("Undo.", "info", 1000); } }
        function editorRedo() { if (editorHistoryIndex < editorHistory.length - 1) { editorHistoryIndex++; editorApplyState(editorHistory[editorHistoryIndex]); showEditorMessageBox("Redo.", "info", 1000); } }

        function duplicateEditorSelectedObject() {
            if (editorSelectedObject && editorScene) {
                const newO = editorSelectedObject.clone();
                newO.name = `${editorSelectedObject.name}_copy`;
                newO.position.x += 0.5; newO.position.y += 0.5;
                editorObjects.push(newO); editorScene.add(newO);
                editorSelectObject(newO); updateEditorObjectList(); editorSaveState();
                showEditorMessageBox(`Duplicated "${editorSelectedObject.name}".`, "success");
            } else { showEditorMessageBox("No object selected to duplicate.", "error"); }
        }

        function deleteEditorSelectedObject() {
            if (editorSelectedObject && editorScene && editorTransformControls) {
                showEditorConfirmModal(`Delete "${editorSelectedObject.name}"?`, (confirmed) => {
                    if (confirmed) {
                        const oldName = editorSelectedObject.name;
                        if(editorTransformControls.object === editorSelectedObject) editorTransformControls.detach();
                        editorScene.remove(editorSelectedObject);
                        if(editorSelectedObject.geometry) editorSelectedObject.geometry.dispose();
                        if(editorSelectedObject.material) editorSelectedObject.material.dispose();
                        editorObjects.splice(editorObjects.indexOf(editorSelectedObject), 1);
                        editorSelectObject(null); updateEditorObjectList(); editorSaveState();
                        showEditorMessageBox(`Deleted "${oldName}".`, "success");
                    }
                });
            } else { showEditorMessageBox("No object selected to delete.", "error"); }
        }

        function deleteEditorSelectedLight() {
            if (editorSelectedLight && editorScene) {
                if (editorSelectedLight === editorDefaultAmbientLight || editorSelectedLight === editorDefaultDirectionalLight) {
                    showEditorMessageBox("Default scene lights cannot be deleted directly. Adjust in World panel.", "info"); return;
                }
                showEditorConfirmModal(`Delete "${editorSelectedLight.name}"?`, (confirmed) => {
                    if (confirmed) {
                        const oldName = editorSelectedLight.name;
                        if (editorTransformControls && editorTransformControls.object === editorSelectedLight) editorTransformControls.detach();
                        if (editorSelectedLight.userData && editorSelectedLight.userData.helper) {
                            editorScene.remove(editorSelectedLight.userData.helper);
                            if(editorSelectedLight.userData.helper.dispose) editorSelectedLight.userData.helper.dispose();
                        }
                        if (editorSelectedLight.target && editorSelectedLight.target.parent === editorScene) {
                            editorScene.remove(editorSelectedLight.target);
                        }
                        editorScene.remove(editorSelectedLight);
                        if(editorSelectedLight.dispose) editorSelectedLight.dispose();
                        editorLights.splice(editorLights.indexOf(editorSelectedLight), 1);
                        editorSelectLight(null); updateEditorObjectList(); editorSaveState();
                        showEditorMessageBox(`Deleted "${oldName}".`, "success");
                    }
                });
            } else { showEditorMessageBox("No light selected to delete.", "error"); }
        }

        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;
                const loader = new THREE.GLTFLoader();

                loader.parse(contents, '', (gltf) => {
                    const model = gltf.scene;
                    model.name = file.name;

                    model.traverse(function (child) {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center); // center the model

                    editorScene.add(model);

                    // Add all meshes to editorObjects for selection, etc.
                    model.traverse(child => {
                        if(child.isMesh) {
                           editorObjects.push(child);
                        }
                    });

                    editorSelectObject(model);
                    updateEditorObjectList();
                    editorSaveState();
                    showEditorMessageBox(`Loaded "${file.name}"`, "success");
                }, (error) => {
                    console.error('An error happened during GLTF loading:', error);
                    showEditorMessageBox(`Error loading ${file.name}. See console for details.`, "error");
                });
            };
            reader.readAsArrayBuffer(file);
            // Reset file input to allow loading the same file again
            event.target.value = '';
        }

        function editorResetCamera(doSave = true) {
            if(!editorCamera || !editorOrbitControls || !editorUi.cameraFOVInput || !editorUi.cameraNearInput || !editorUi.cameraFarInput) return;
            editorCamera.position.set(8,8,8); editorOrbitControls.target.set(0,1,0);
            editorCamera.fov = 60; editorCamera.near = 0.1; editorCamera.far = 5000;
            editorCamera.updateProjectionMatrix(); editorOrbitControls.update();
            editorUi.cameraFOVInput.value = 60;
            editorUi.cameraNearInput.value = 0.1;
            editorUi.cameraFarInput.value = 5000;
            showEditorMessageBox("Camera reset.", 'info', 1000);
            if(doSave) editorSaveState();
        }

        function frameEditorSelectedObject() {
            if (editorSelectedObject && editorCamera && editorOrbitControls) {
                const box = new THREE.Box3().setFromObject(editorSelectedObject);
                const center = new THREE.Vector3(); box.getCenter(center);
                const size = new THREE.Vector3(); box.getSize(size);
                const maxDim = Math.max(size.x,size.y,size.z);

                const fov = editorCamera.fov * (Math.PI/180);
                let cameraDistance = Math.abs(maxDim / 1.25 / Math.tan(fov/2));
                cameraDistance = Math.max(cameraDistance, maxDim * 1.5, 1);
                cameraDistance = Math.min(cameraDistance, 500);

                let direction = new THREE.Vector3().subVectors(editorCamera.position, editorOrbitControls.target).normalize();
                if(direction.lengthSq() === 0) direction.set(0.5,0.5,1).normalize();

                const newCameraPosition = new THREE.Vector3().addVectors(center, direction.multiplyScalar(cameraDistance));

                editorCamera.position.copy(newCameraPosition);
                editorOrbitControls.target.copy(center); editorCamera.lookAt(center); editorOrbitControls.update();
                showEditorMessageBox(`Framed "${editorSelectedObject.name}".`, 'info', 1000);
            } else { showEditorMessageBox("No object selected to frame.", 'error'); }
        }

        function editorRenderImage() {
            if (!editorUi.loadingOverlay || !editorUi.loadingOverlayText || !editorRenderer || !editorScene || !editorCamera || !editorUi.renderOutputFormat) return;
            editorUi.loadingOverlay.classList.add('show');
            editorUi.loadingOverlayText.textContent = "Rendering Image...";
            setTimeout(() => {
                try {
                    editorRenderer.render(editorScene, editorCamera);
                    const dataURL = editorRenderer.domElement.toDataURL(editorUi.renderOutputFormat.value === 'jpeg' ? 'image/jpeg' : 'image/png');
                    const link = document.createElement('a');
                    link.download = `render_${(currentProjectName || 'scene').replace(/\s+/g, '_')}_${Date.now()}.${editorUi.renderOutputFormat.value}`;
                    link.href = dataURL; link.click();
                    showEditorMessageBox("Image downloaded.", "success");
                } catch(e){
                    showEditorMessageBox("Render error. Check console for details.", "error");
                    console.error("Render image error:", e);
                } finally { editorUi.loadingOverlay.classList.remove('show'); }
            }, 100);
        }

        function showEditorDimensionModal() {
            if (!editorUi.boxWidthInput || !editorUi.boxHeightInput || !editorUi.boxDepthInput || !editorUi.dimensionModalOverlayEditor) return;
            editorUi.boxWidthInput.value = 1; editorUi.boxHeightInput.value = 1; editorUi.boxDepthInput.value = 1;
            editorUi.dimensionModalOverlayEditor.classList.add('show'); editorUi.boxWidthInput.focus();
        }

        function toggleEditorSnapping() {
            isSnappingEnabled = !isSnappingEnabled;
            if (editorUi.toggleSnappingBtn) editorUi.toggleSnappingBtn.classList.toggle('active', isSnappingEnabled);
            showEditorMessageBox(`Snapping ${isSnappingEnabled ? 'Enabled' : 'Disabled'}.`, 'info', 1200);
            if (editorTransformControls) {
                editorTransformControls.translationSnap = isSnappingEnabled ? 0.5 : null;
                editorTransformControls.rotationSnap = isSnappingEnabled ? THREE.MathUtils.degToRad(15) : null;
            }
        }

        function toggleLightHelpersVisibility() {
            if (!editorScene) { showEditorMessageBox("Scene not initialized.", "info"); return; }
            let anyHelperVisible = false;
            editorLights.forEach(light => {
                if (light.userData.helper) {
                    light.userData.helper.visible = !light.userData.helper.visible;
                    if (light.userData.helper.visible) anyHelperVisible = true;
                }
            });
            showEditorMessageBox(`Light Helpers ${anyHelperVisible ? 'Enabled' : 'Disabled'}.`, 'info', 1200);
        }


        function startRectangleDrawing() {
            cancelActiveToolModes();
            isDrawingRectangle = true;
            rectangleStartPoint = null;
            if (editorUi.renderCanvas) editorUi.renderCanvas.classList.add('crosshair-cursor');
            if (editorOrbitControls) editorOrbitControls.enabled = false;
            showEditorMessageBox("Rectangle Tool: Click on ground to set first corner.", "info");
        }

        function startPushPullMode() {
            cancelActiveToolModes();
            isPushPullMode = true;
            objectToPushPull = null;
            pushPullFaceNormal = null;
            pushPullFaceIndex = -1;
            if (editorUi.renderCanvas) editorUi.renderCanvas.classList.add('crosshair-cursor');
            if (editorOrbitControls) editorOrbitControls.enabled = false;
            showEditorMessageBox("Push/Pull Tool: Click on a flat plane or box face to extrude.", "info");
        }

        function performPlaneExtrusion() {
            if (!objectToPushPull || !editorUi.extrusionHeightInput || !editorUi.extrusionModalOverlayEditor || !pushPullFaceNormal) {
                cancelActiveToolModes();
                return;
            }
            const height = parseFloat(editorUi.extrusionHeightInput.value);
            if (isNaN(height) || height <= 0) {
                showEditorMessageBox("Invalid extrusion height. Must be a positive number.", "error");
                return;
            }

            const originalObject = objectToPushPull;
            const originalGeometry = originalObject.geometry;
            const originalMaterial = originalObject.material;
            const originalPosition = originalObject.position.clone();
            const originalRotation = originalObject.rotation.clone();
            const originalScale = originalObject.scale.clone();
            const originalName = originalObject.name;

            let newGeometry;
            let newObject;

            if (originalGeometry.type === 'PlaneGeometry') {
                const planeWidth = originalGeometry.parameters.width;
                const planeHeight = originalGeometry.parameters.height;

                newGeometry = new THREE.BoxGeometry(planeWidth, height, planeHeight);
                newObject = new THREE.Mesh(newGeometry, originalMaterial.clone());
                newObject.position.copy(originalPosition);
                newObject.position.y += height / 2;
                newObject.rotation.copy(originalRotation);
                newObject.scale.copy(originalScale);
                newObject.name = `${originalName}_Extruded`;
                newObject.userData.type = 'ExtrudedSlab';
                newObject.castShadow = true;
                newObject.receiveShadow = true;

            } else if (originalGeometry.type === 'BoxGeometry') {
                const boxWidth = originalGeometry.parameters.width;
                const boxHeight = originalGeometry.parameters.height;
                const boxDepth = originalGeometry.parameters.depth;

                let extrudedGeo;
                let extrudedPos = new THREE.Vector3();

                const worldNormal = pushPullFaceNormal.clone().transformDirection(originalObject.matrixWorld).normalize();

                if (Math.abs(worldNormal.x) > 0.9) {
                    extrudedGeo = new THREE.BoxGeometry(height, boxHeight * originalScale.y, boxDepth * originalScale.z);
                    extrudedPos.x = originalPosition.x + (boxWidth * originalScale.x / 2 + height / 2) * Math.sign(worldNormal.x);
                    extrudedPos.y = originalPosition.y;
                    extrudedPos.z = originalPosition.z;
                } else if (Math.abs(worldNormal.y) > 0.9) {
                    extrudedGeo = new THREE.BoxGeometry(boxWidth * originalScale.x, height, boxDepth * originalScale.z);
                    extrudedPos.x = originalPosition.x;
                    extrudedPos.y = originalPosition.y + (boxHeight * originalScale.y / 2 + height / 2) * Math.sign(worldNormal.y);
                    extrudedPos.z = originalPosition.z;
                } else if (Math.abs(worldNormal.z) > 0.9) {
                    extrudedGeo = new THREE.BoxGeometry(boxWidth * originalScale.x, boxHeight * originalScale.y, height);
                    extrudedPos.x = originalPosition.x;
                    extrudedPos.y = originalPosition.y;
                    extrudedPos.z = originalPosition.z + (boxDepth * originalScale.z / 2 + height / 2) * Math.sign(worldNormal.z);
                } else {
                     showEditorMessageBox("Could not determine primary extrusion axis for box. Try aligning the view.", "error");
                     cancelActiveToolModes();
                     return;
                }

                newObject = new THREE.Mesh(extrudedGeo, originalMaterial.clone());
                newObject.position.copy(extrudedPos);
                newObject.rotation.copy(originalRotation);
                newObject.name = `${originalName}_Extruded`;
                newObject.userData.type = 'ExtrudedBox';
                newObject.castShadow = true;
                newObject.receiveShadow = true;
            } else {
                showEditorMessageBox("Extrusion is only supported for Plane and Box geometries.", "error");
                cancelActiveToolModes();
                return;
            }

            if (newObject) {
                editorScene.add(newObject);
                editorObjects.push(newObject);

                const objectIndex = editorObjects.indexOf(originalObject);
                if (objectIndex > -1) editorObjects.splice(objectIndex, 1);
                editorScene.remove(originalObject);
                if (originalObject.geometry) originalObject.geometry.dispose();
                if (originalObject.material) originalObject.material.dispose();

                editorSelectObject(newObject);
                editorSaveState();
                showEditorMessageBox("Object extruded successfully.", "success");
            }
            editorUi.extrusionModalOverlayEditor.classList.remove('show');
            cancelActiveToolModes();
        }


        function cancelActiveToolModes() {
            if (isDrawingRectangle) {
                if (rectanglePreviewMesh) {
                    editorScene.remove(rectanglePreviewMesh);
                    if(rectanglePreviewMesh.geometry) rectanglePreviewMesh.geometry.dispose();
                    if(rectanglePreviewMesh.material) rectanglePreviewMesh.material.dispose();
                    rectanglePreviewMesh = null;
                }
                isDrawingRectangle = false;
                rectangleStartPoint = null;
                showEditorMessageBox("Rectangle drawing cancelled.", "info", 1500);
            }
            if (isPushPullMode) {
                isPushPullMode = false;
                objectToPushPull = null;
                pushPullFaceNormal = null;
                pushPullFaceIndex = -1;
                showEditorMessageBox("Push/Pull mode cancelled.", "info", 1500);
            }

            if (editorUi.renderCanvas) editorUi.renderCanvas.classList.remove('crosshair-cursor');
            if (editorOrbitControls) editorOrbitControls.enabled = true;
        }


        function initStats() {
            try {
                if (typeof Stats === 'undefined') {
                    console.warn("Stats.js library not found. Performance monitor will not be available.");
                    stats = null;
                    return;
                }
                stats = new Stats();
                stats.dom.style.position = 'absolute';
                stats.dom.style.left = '10px';
                stats.dom.style.top = '10px';
                stats.dom.style.zIndex = '100';
                const renderCanvasContainer = document.getElementById('renderCanvasContainer');
                if (renderCanvasContainer) {
                    renderCanvasContainer.appendChild(stats.dom);
                    stats.dom.style.display = 'none';
                } else {
                    console.warn("renderCanvasContainer not found. Stats.js cannot be added.");
                    stats = null;
                }
            } catch (e) {
                console.error("Error initializing Stats.js:", e);
                stats = null;
            }
        }

        window.toggleStatsGlobal = function() {
            if (!stats || !stats.dom) {
                showEditorMessageBox("Performance monitor (Stats.js) is not available or failed to initialize.", "info");
                return;
            }
            stats.dom.style.display = stats.dom.style.display === 'none' ? 'block' : 'none';
        }

        window.toggleGridGlobal = function() {
            if (!editorScene) { showEditorMessageBox("Scene not initialized.", "info"); return; }
            const grid = editorScene.getObjectByName('EditorGrid');
            if (grid) {
                grid.visible = !grid.visible;
                showEditorMessageBox(`Grid ${grid.visible ? 'Enabled' : 'Disabled'}.`, 'info', 1200);
            } else { showEditorMessageBox("Grid helper not found in scene.", "info"); }
        }

        window.toggleWireframeGlobal = function() {
            if (!editorObjects || editorObjects.length === 0) {
                showEditorMessageBox("No objects in scene to toggle wireframe.", "info"); return;
            }
            let isWireframeEnabled = false;
            editorObjects.forEach((obj, index) => {
                if (obj.material) {
                    obj.material.wireframe = !obj.material.wireframe;
                    obj.material.needsUpdate = true;
                    if(index === 0) isWireframeEnabled = obj.material.wireframe;
                }
            });
            showEditorMessageBox(`Wireframe ${isWireframeEnabled ? 'Enabled' : 'Disabled'}.`, 'info', 1200);
        }

        window.resetCameraPositionGlobal = function() {
            if (!editorCamera || !editorOrbitControls) {
                 showEditorMessageBox("Camera not initialized.", "info"); return;
            }
            editorResetCamera(true);
        }

        // --- App Initialization (DOM Ready) ---
        document.addEventListener('DOMContentLoaded', () => {
            console.log("ArchViz Pro Studio: DOM fully loaded. Initializing application...");

            projectManagerView = document.getElementById('project-manager-view');
            projectManagerLoading = document.getElementById('project-manager-loading');
            projectListUI = document.getElementById('project-list');
            noProjectsMessageUI = document.getElementById('no-projects-message');
            createNewProjectBtn = document.getElementById('createNewProjectBtn');
            newProjectModal = document.getElementById('newProjectModal');
            projectNameInput = document.getElementById('projectNameInput');
            cancelNewProjectBtn = document.getElementById('cancelNewProjectBtn');
            confirmNewProjectBtn = document.getElementById('confirmNewProjectBtn');
            confirmDeleteModal = document.getElementById('confirmDeleteModal');
            confirmDeleteMessageUI = document.getElementById('confirmDeleteMessage');
            cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            globalMessageBox = document.getElementById('globalMessageBox');
            editorView = document.getElementById('editor-view');

            const editorUiElementsToCache = {
                backToProjectsBtn: 'backToProjectsBtn', currentProjectNameDisplay: 'currentProjectNameDisplay',
                saveProjectBtn: 'saveProjectBtn', exportSceneJsonBtn: 'exportSceneJsonBtn', importSceneJsonBtn: 'importSceneJsonBtn',
                undoBtn: 'undoBtn', redoBtn: 'redoBtn', leftSidebar: 'left-sidebar', rightSidebar: 'right-sidebar',
                leftSidebarToggleBtn: 'left-sidebar-toggle', rightSidebarToggleBtn: 'right-sidebar-toggle',
                addCubeBtn: 'addCubeBtn', addSphereBtn: 'addSphereBtn', addCylinderBtn: 'addCylinderBtn', addPlaneBtn: 'addPlaneBtn',
                addTorusBtn: 'addTorusBtn', addConeBtn: 'addConeBtn', addText3DBtn: 'addText3DBtn', // New Primitives
                createBoxBtn: 'createBoxBtn', addRectangleBtn: 'addRectangleBtn', addWallBtn: 'addWallBtn', addSlabBtn: 'addSlabBtn',
                pushPullBtn: 'pushPullBtn', addStairsBtn: 'addStairsBtn', addDoorBtn: 'addDoorBtn', addWindowBtn: 'addWindowBtn', addRoofBtn: 'addRoofBtn', // New Arch Tools
                drawPolylineBtn: 'drawPolylineBtn', drawArcBtn: 'drawArcBtn', importSvgBtn: 'importSvgBtn', // New Drawing Tools
                addPointLightBtn: 'addPointLightBtn', addDirectionalLightBtn: 'addDirectionalLightBtn',
                addSpotLightBtn: 'addSpotLightBtn', addAmbientLightBtn: 'addAmbientLightBtn', addAreaLightBtn: 'addAreaLightBtn', // New Light
                toggleLightHelpersBtn: 'toggleLightHelpersBtn', objectListPanel: 'objectList',
                cameraFOVInput: 'cameraFOV', cameraNearInput: 'cameraNear', cameraFarInput: 'cameraFar', saveNamedViewBtn: 'saveNamedViewBtn',
                importModelBtn: 'importModelBtn', modelFileInput: 'model-file-input', renderCanvas: 'renderCanvas', viewTranslateBtn: 'viewTranslateBtn',
                viewRotateBtn: 'viewRotateBtn', viewScaleBtn: 'viewScaleBtn', viewTopBtn: 'viewTopBtn',
                viewFrontBtn: 'viewFrontBtn', viewSideBtn: 'viewSideBtn', viewIsoBtn: 'viewIsoBtn',
                viewResetBtn: 'viewResetBtn', viewFrameBtn: 'viewFrameBtn', toggleSnappingBtn: 'toggleSnappingBtn',
                snappingOptionsSelect: 'snappingOptionsSelect', shadingModeSelect: 'shadingModeSelect', // Viewport toolbar additions
                selectionPropertiesPanel: 'selection-props-panel', objectPropertiesContainer: 'objectProperties',
                lightPropertiesDisplayContainer: 'lightPropertiesDisplay', noSelectionMessage: 'noSelectionMessage',
                lightNameInput: 'lightName', lightColorInput: 'lightColor', lightIntensityInput: 'lightIntensity',
                lightDistanceInput: 'lightDistance', lightDistanceGroup: 'lightDistanceGroup', lightDecayInput: 'lightDecay',
                lightDecayGroup: 'lightDecayGroup', lightAngleInput: 'lightAngle', lightAngleGroup: 'lightAngleGroup',
                lightPenumbraInput: 'lightPenumbra', lightPenumbraGroup: 'lightPenumbraGroup', deleteLightBtn: 'deleteLightBtn',
                objectOpacityInput: 'objectOpacityEditor', // New material property
                renderResolution: 'renderResolution', renderSamples: 'renderSamples', renderOutputFormat: 'renderOutputFormat',
                denoiseRender: 'denoiseRender', addToRenderQueueBtn: 'addToRenderQueueBtn', // Render panel additions
                renderImageBtn: 'renderImageBtn', renderVideoBtn: 'renderVideoBtn', timelineSlider: 'timelineSlider',
                currentFrameSpan: 'currentFrame', playAnimationBtn: 'playAnimationBtn', addKeyframeBtn: 'addKeyframeBtn', frameRate: 'frameRate',
                sceneBgColorInput: 'sceneBgColor', ambientLightColorInput: 'ambientLightColor', hdriEnvironmentSelect: 'hdriEnvironment', uploadHdriBtn: 'uploadHdriBtn',
                sunIntensityInput: 'sunIntensity', sunAzimuthSlider: 'sunAzimuth', sunElevationSlider: 'sunElevation', // Sun & Sky
                fogEnableCheckbox: 'fogEnable', fogColorInput: 'fogColor', fogNearInput: 'fogNear', fogFarInput: 'fogFar', // Fog
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
                settingsBtn: 'settingsBtn', helpBtn: 'helpBtn', measureToolBtn: 'measureToolBtn' // Top toolbar additions
            };
            for (const key in editorUiElementsToCache) {
                editorUi[key] = document.getElementById(editorUiElementsToCache[key]);
                if (!editorUi[key] && key !== 'leftSidebarTabs' && key !== 'rightSidebarTabs') {
                    console.warn(`UI Element not found during caching: ${key} (ID: ${editorUiElementsToCache[key]})`);
                }
            }
            editorUi.leftSidebarTabs = document.querySelectorAll('#left-sidebar-tabs .sidebar-tab');
            editorUi.rightSidebarTabs = document.querySelectorAll('#right-sidebar-tabs .sidebar-tab');

            if (editorUi.pushPullBtn) editorUi.pushPullBtn.disabled = false;

            try {
                loadProjects();

                if (editorUi.leftSidebarToggleBtn && editorUi.rightSidebarToggleBtn) {
                    const leftIcon = editorUi.leftSidebarToggleBtn.querySelector('i');
                    if (leftIcon) {
                        leftIcon.classList.remove('fa-chevron-right');
                        leftIcon.classList.add('fa-chevron-left');
                    }
                    const rightIcon = editorUi.rightSidebarToggleBtn.querySelector('i');
                     if (rightIcon) {
                        rightIcon.classList.remove('fa-chevron-left');
                        rightIcon.classList.add('fa-chevron-right');
                    }
                } else {
                    console.warn("Sidebar toggle buttons or their icons not found during DOMContentLoaded.");
                }

                if (createNewProjectBtn) createNewProjectBtn.addEventListener('click', () => {
                    if (!projectNameInput || !newProjectModal) return;
                    projectNameInput.value = '';
                    newProjectModal.classList.add('show');
                    projectNameInput.focus();
                });

                if (cancelNewProjectBtn) cancelNewProjectBtn.addEventListener('click', () => newProjectModal.classList.remove('show'));

                if (confirmNewProjectBtn) confirmNewProjectBtn.addEventListener('click', () => {
                    if (!projectNameInput || !confirmNewProjectBtn) return;
                    const name = projectNameInput.value.trim();
                    if (!name) {
                        showGlobalMessageBox("Project name cannot be empty.", "error");
                        return;
                    }
                    confirmNewProjectBtn.disabled = true;
                    confirmNewProjectBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

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

                        if (newProjectModal) newProjectModal.classList.remove('show');
                        showGlobalMessageBox(`Project "${name}" created! Opening...`, "success", 2000);
                        setTimeout(() => openProject(newProject.id, name), 100);
                    } catch (e) {
                        console.error("Error creating new project:", e);
                        showGlobalMessageBox("Failed to create project. See console for details.", "error");
                    } finally {
                        confirmNewProjectBtn.disabled = false;
                        confirmNewProjectBtn.innerHTML = 'Create Project';
                    }
                });

                if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
                    if (!confirmDeleteModal) return;
                    confirmDeleteModal.classList.remove('show');
                    projectToDeleteId = null;
                });

                if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
                    if (!projectToDeleteId || !confirmDeleteBtn) return;
                    confirmDeleteBtn.disabled = true;
                    confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Deleting...';

                    try {
                        let projects = getProjectsFromLocalStorage();
                        projects = projects.filter(p => p.id !== projectToDeleteId);
                        saveProjectsToLocalStorage(projects);

                        if (confirmDeleteModal) confirmDeleteModal.classList.remove('show');
                        showGlobalMessageBox("Project deleted successfully.", "success");
                        loadProjects();
                    } catch (e) {
                        console.error("Error deleting project:", e);
                        showGlobalMessageBox("Failed to delete project. See console for details.", "error");
                    } finally {
                        confirmDeleteBtn.disabled = false;
                        confirmDeleteBtn.innerHTML = 'Delete Project';
                        projectToDeleteId = null;
                    }
                });

                setupEditorEventListeners();

                console.log("ArchViz Pro Studio: Application initialized.");
            } catch (e) {
                console.error("Error during DOMContentLoaded logic:", e);
                if (globalMessageBox) {
                    showGlobalMessageBox("Error initializing application. Check console.", "error", 10000);
                } else {
                    console.error("Critical Error: globalMessageBox not available. Application initialization failed.");
                }
            }
        });

        console.log("ArchViz Pro Studio: Main script processed.");
    })();
    // SCRIPT END
