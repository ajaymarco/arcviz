import * as THREE from 'three';
import { editorState } from './state.js';
import { ui } from './ui.js';
import { editor } from './editor.js';
import { executeCommand } from './history.js';
import { AddObjectCommand, DeleteObjectCommand, AddLightCommand, DeleteLightCommand } from './commands.js';

export function addObject(geometry, baseType = 'Object', name = null) {
    if (!editor.isReady()) {
        ui.showEditorMessageBox("Editor not ready to add objects.", "error");
        return null;
    }
    const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.6,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    material.color.convertSRGBToLinear();

    const object = new THREE.Mesh(geometry, material);
    object.name = name || `${baseType}_${editorState.objects.length + 1}`;
    object.userData.type = baseType;
    object.castShadow = true;
    object.receiveShadow = true;

    executeCommand(new AddObjectCommand(object));

    ui.showEditorMessageBox(`Added ${object.name}.`, "success", 1500);
    return object;
}

export function createBoxWithDimensions() {
    const { boxWidth, boxHeight, boxDepth } = ui.elements;
    const width = Math.max(0.01, parseFloat(boxWidth.value) || 1);
    const height = Math.max(0.01, parseFloat(boxHeight.value) || 1);
    const depth = Math.max(0.01, parseFloat(boxDepth.value) || 1);

    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const boxName = `Box (${width}x${height}x${depth})`;
    const boxMesh = addObject(boxGeo, 'Box', boxName);

    if(boxMesh) {
        boxMesh.position.y = height / 2;
    }

    ui.hideDimensionModal();
}

export function addLight(type) {
    if (!editor.isReady()) {
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
    }

    executeCommand(new AddLightCommand(light));
    ui.showEditorMessageBox(`Added ${light.name}.`, "success", 1500);
    return light;
}

export function deleteSelected() {
    const objectToDelete = editorState.selectedObject;
    const lightToDelete = editorState.selectedLight;

    if (objectToDelete) {
        ui.showConfirmModal(`Are you sure you want to delete "${objectToDelete.name}"?`, (confirmed) => {
            if (confirmed) {
                executeCommand(new DeleteObjectCommand(objectToDelete));
                ui.showEditorMessageBox(`Deleted ${objectToDelete.name}.`, "success");
            }
            ui.hideConfirmModal();
        });
    } else if (lightToDelete) {
        ui.showConfirmModal(`Are you sure you want to delete "${lightToDelete.name}"?`, (confirmed) => {
            if (confirmed) {
                executeCommand(new DeleteLightCommand(lightToDelete));
                ui.showEditorMessageBox(`Deleted ${lightToDelete.name}.`, "success");
            }
            ui.hideConfirmModal();
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