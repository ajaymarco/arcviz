import * as THREE from 'three';
import { appState, editorState, uiState } from './state.js';
import { ui } from './ui.js';
import { editor } from './editor.js';
import { saveState } from './history.js';

export function addObject(geometry, baseType = 'Object') {
    if (!appState.isEditorInitialized) {
        ui.showEditorMessageBox("Editor not ready to add objects.", "error");
        return null;
    }
    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, metalness: 0.2 });
    material.color.convertSRGBToLinear();

    const object = new THREE.Mesh(geometry, material);
    object.name = `${baseType}_${editorState.objects.length + 1}`;
    object.userData.type = baseType;
    object.castShadow = true;
    object.receiveShadow = true;

    editorState.scene.add(object);
    editorState.objects.push(object);

    editor.selectObject(object);
    ui.updateObjectList();
    ui.showEditorMessageBox(`Added ${object.name}.`, "success", 1500);
    saveState();
    return object;
}

export function createBoxWithDimensions() {
    const { boxWidth, boxHeight, boxDepth } = ui.elements;
    const width = Math.max(0.01, parseFloat(boxWidth.value) || 1);
    const height = Math.max(0.01, parseFloat(boxHeight.value) || 1);
    const depth = Math.max(0.01, parseFloat(boxDepth.value) || 1);

    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const boxMesh = addObject(boxGeo, `Box (${width}x${height}x${depth})`);
    if(boxMesh) {
        boxMesh.position.y = height / 2;
    }

    ui.hideDimensionModal();
    saveState();
}

export function addLight(type) {
    if (!appState.isEditorInitialized) {
        ui.showEditorMessageBox("Editor not ready to add lights.", "error");
        return null;
    }
    let light, helper;
    const lightColor = 0xfff5e0;

    switch (type) {
        case 'Point':
            light = new THREE.PointLight(lightColor, 1, 50, 1.5);
            light.position.set(2, 3, 2);
            helper = new THREE.PointLightHelper(light, 0.5);
            break;
        case 'Directional':
            light = new THREE.DirectionalLight(lightColor, 0.8);
            light.position.set(5, 10, 7.5);
            helper = new THREE.DirectionalLightHelper(light, 1);
            break;
        case 'Spot':
            light = new THREE.SpotLight(lightColor, 1, 70, Math.PI / 4, 0.3, 1.5);
            light.position.set(0, 5, 3);
            helper = new THREE.SpotLightHelper(light);
            break;
        default:
            return null;
    }

    light.name = `${type}Light_${editorState.lights.length + 1}`;
    light.userData.type = type;
    light.castShadow = true;
    if (helper) {
        light.userData.helper = helper;
        editorState.scene.add(helper);
    }

    editorState.scene.add(light);
    editorState.lights.push(light);
    editor.selectLight(light);
    ui.updateObjectList();
    saveState();
    return light;
}

export function deleteSelected() {
    const objectToDelete = editorState.selectedObject;
    const lightToDelete = editorState.selectedLight;

    if (objectToDelete) {
        ui.showConfirmModal(`Delete "${objectToDelete.name}"?`, (confirmed) => {
            if (confirmed) {
                const index = editorState.objects.indexOf(objectToDelete);
                if (index > -1) editorState.objects.splice(index, 1);

                if (editorState.transformControls.object === objectToDelete) editorState.transformControls.detach();
                editorState.scene.remove(objectToDelete);
                if (objectToDelete.geometry) objectToDelete.geometry.dispose();
                if (objectToDelete.material) objectToDelete.material.dispose();

                editor.selectObject(null);
                saveState();
                ui.hideConfirmModal();
            } else {
                ui.hideConfirmModal();
            }
        });
    } else if (lightToDelete) {
        ui.showConfirmModal(`Delete "${lightToDelete.name}"?`, (confirmed) => {
            if (confirmed) {
                const index = editorState.lights.indexOf(lightToDelete);
                if (index > -1) editorState.lights.splice(index, 1);

                if (lightToDelete.userData.helper) editorState.scene.remove(lightToDelete.userData.helper);
                if (lightToDelete.target) editorState.scene.remove(lightToDelete.target);
                editorState.scene.remove(lightToDelete);

                editor.selectLight(null);
                saveState();
                ui.hideConfirmModal();
            } else {
                ui.hideConfirmModal();
            }
        });
    }
}

export function setTransformMode(mode) {
    if (editorState.transformControls) {
        editorState.transformControls.setMode(mode);
        ui.updateTransformModeButtons(mode);
    }
}

export function toggleGrid() {
    const grid = editorState.scene.getObjectByName('EditorGrid');
    if (grid) {
        grid.visible = !grid.visible;
        ui.showEditorMessageBox(`Grid ${grid.visible ? 'Enabled' : 'Disabled'}.`, 'info');
    }
}

export function toggleStats() {
    if (editorState.stats) {
        const isVisible = editorState.stats.dom.style.display !== 'none';
        editorState.stats.dom.style.display = isVisible ? 'none' : 'block';
    }
}