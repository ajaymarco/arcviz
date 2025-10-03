import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { appState, editorState, toolState } from './state.js';
import { ui } from './ui.js';

class Editor {
    init() {
        if (typeof THREE === 'undefined') {
            console.error("THREE.js is not loaded!");
            ui.showGlobalMessageBox("Critical error: 3D library not loaded.", "error");
            return;
        }

        try {
            const canvas = ui.elements.renderCanvas;
            const container = ui.elements.renderCanvasContainer;
            if (!canvas || !container) {
                console.error("Render canvas or container not found!");
                return;
            }

            // Scene setup
            editorState.scene = new THREE.Scene();
            editorState.scene.background = new THREE.Color(ui.elements.sceneBgColor.value || '#1a1d21');

            // Camera
            editorState.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
            editorState.camera.position.set(8, 8, 8);

            // Renderer
            editorState.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
            editorState.renderer.setSize(container.clientWidth, container.clientHeight);
            editorState.renderer.setPixelRatio(window.devicePixelRatio);
            editorState.renderer.shadowMap.enabled = true;
            editorState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Controls
            editorState.orbitControls = new OrbitControls(editorState.camera, editorState.renderer.domElement);
            editorState.orbitControls.enableDamping = true;
            editorState.orbitControls.dampingFactor = 0.075;
            editorState.orbitControls.target.set(0, 1, 0);

            editorState.transformControls = new TransformControls(editorState.camera, editorState.renderer.domElement);
            editorState.transformControls.setSize(0.8);
            editorState.scene.add(editorState.transformControls);

            // Lights
            editorState.defaultAmbientLight = new THREE.AmbientLight(new THREE.Color(ui.elements.ambientLightColor.value), parseFloat(ui.elements.ambientLightIntensity.value));
            editorState.defaultAmbientLight.name = "Default Ambient Light";
            editorState.scene.add(editorState.defaultAmbientLight);

            editorState.defaultDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            editorState.defaultDirectionalLight.position.set(20, 30, 15);
            editorState.defaultDirectionalLight.castShadow = true;
            editorState.defaultDirectionalLight.name = "Default Sun Light";
            editorState.scene.add(editorState.defaultDirectionalLight);

            // Helpers
            const gridHelper = new THREE.GridHelper(100, 50, 0x4b5162, 0x3a3f4b);
            gridHelper.name = 'EditorGrid';
            editorState.scene.add(gridHelper);

            // Stats
            if (typeof Stats !== 'undefined') {
                editorState.stats = new Stats();
                editorState.stats.dom.style.position = 'absolute';
                editorState.stats.dom.style.left = '10px';
                editorState.stats.dom.style.top = '10px';
                container.appendChild(editorState.stats.dom);
                editorState.stats.dom.style.display = 'none'; // Initially hidden
            }

            // Event Listeners
            window.addEventListener('resize', () => this.onWindowResize(), false);
            // Other event listeners (click, keydown) will be in events.js

            appState.isEditorInitialized = true;
            this.animate();
            console.log("Editor initialized successfully.");

        } catch (error) {
            console.error("Error during editor initialization:", error);
            ui.showGlobalMessageBox("Critical error initializing 3D editor.", "error");
            appState.isEditorInitialized = false;
        }
    }

    animate() {
        if (!appState.isEditorInitialized) return;
        requestAnimationFrame(() => this.animate());

        editorState.orbitControls.update();
        if (editorState.stats && editorState.stats.dom.style.display !== 'none') {
            editorState.stats.update();
        }
        editorState.renderer.render(editorState.scene, editorState.camera);
    }

    onWindowResize() {
        if (!appState.isEditorInitialized) return;
        const container = ui.elements.renderCanvasContainer;
        if (!container) return;

        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        if (newWidth > 0 && newHeight > 0) {
            editorState.camera.aspect = newWidth / newHeight;
            editorState.camera.updateProjectionMatrix();
            editorState.renderer.setSize(newWidth, newHeight);
        }
    }

    selectObject(object) {
        if (editorState.selectedObject && editorState.selectedObject.material && editorState.selectedObject.material.emissive) {
            editorState.selectedObject.material.emissive.setHex(editorState.selectedObject.userData.originalEmissiveHex || 0x000000);
        }

        if (editorState.transformControls.object) {
            editorState.transformControls.detach();
        }

        editorState.selectedObject = object;
        editorState.selectedLight = null;

        if (editorState.selectedObject) {
            if (editorState.selectedObject.material && editorState.selectedObject.material.emissive) {
                editorState.selectedObject.userData.originalEmissiveHex = editorState.selectedObject.material.emissive.getHex();
                editorState.selectedObject.material.emissive.setHex(0x82aaff);
            }
            editorState.transformControls.attach(editorState.selectedObject);
        }

        ui.updateSelectionPropertiesVisibility();
        ui.updateSelectedObjectPropertiesPanel();
        ui.updateObjectList();
    }

    selectLight(light) {
        // Simplified for now
        editorState.selectedLight = light;
        editorState.selectedObject = null;

        if (editorState.transformControls.object) {
            editorState.transformControls.detach();
        }
        if (editorState.selectedLight && editorState.selectedLight.position) {
            editorState.transformControls.attach(editorState.selectedLight);
        }

        ui.updateSelectionPropertiesVisibility();
        ui.updateSelectedLightPropertiesPanel();
        ui.updateObjectList();
    }

    setCameraView(type) {
        const target = editorState.selectedObject ? new THREE.Box3().setFromObject(editorState.selectedObject).getCenter(new THREE.Vector3()) : editorState.orbitControls.target.clone();
        let position = new THREE.Vector3();
        const distance = 10; // Simplified distance

        switch(type) {
            case 'top': position.set(target.x, target.y + distance, target.z); editorState.camera.up.set(0,1,0); break;
            case 'front': position.set(target.x, target.y, target.z + distance); editorState.camera.up.set(0,1,0); break;
            case 'side': position.set(target.x + distance, target.y, target.z); editorState.camera.up.set(0,1,0); break;
            case 'iso': position.set(target.x + distance*0.7, target.y + distance*0.7, target.z + distance*0.7); editorState.camera.up.set(0,1,0); break;
        }
        editorState.camera.position.copy(position);
        editorState.camera.lookAt(target);
        editorState.orbitControls.target.copy(target);
    }
}

export const editor = new Editor();