import * as THREE from 'three';
import { appState, editorState, constants } from './state.js';
import { ui } from './ui.js';
import { editor } from './editor.js';

function getCurrentSceneState() {
    if (!appState.isEditorInitialized) return null;

    return {
        objects: editorState.objects.map(o => ({
            uuid: o.uuid,
            name: o.name,
            type: o.userData.type,
            geometryType: o.geometry.type,
            geometryParams: o.geometry.parameters,
            position: o.position.toArray(),
            rotation: o.rotation.toArray(),
            scale: o.scale.toArray(),
            material: {
                color: `#${o.material.color.clone().convertLinearToSRGB().getHexString()}`,
                emissive: `#${(o.material.emissive ? o.material.emissive.clone().convertLinearToSRGB() : new THREE.Color(0x000000)).getHexString()}`,
                roughness: o.material.roughness,
                metalness: o.material.metalness,
                opacity: o.material.opacity,
                transparent: o.material.transparent
            }
        })),
        lights: editorState.lights.map(l => ({
            uuid: l.uuid,
            name: l.name,
            type: l.userData.type,
            position: l.position ? l.position.toArray() : null,
            targetPosition: (l.target && l.target.position) ? l.target.position.toArray() : null,
            color: `#${l.color.getHexString()}`,
            intensity: l.intensity,
            distance: l.distance,
            decay: l.decay,
            angle: l.angle,
            penumbra: l.penumbra
        })),
        camera: {
            position: editorState.camera.position.toArray(),
            target: editorState.orbitControls.target.toArray(),
            fov: editorState.camera.fov,
            near: editorState.camera.near,
            far: editorState.camera.far
        },
        sceneBgColor: editorState.scene.background.getHexString(),
        defaultAmbientLightColor: editorState.defaultAmbientLight.color.getHexString(),
        defaultAmbientLightIntensity: editorState.defaultAmbientLight.intensity,
    };
}

export function saveState(addToHistory = true) {
    if (!appState.isEditorInitialized) return;

    const currentStateString = JSON.stringify(getCurrentSceneState());

    if (!addToHistory) {
        editorState.history = [currentStateString];
        editorState.historyIndex = 0;
        ui.updateUndoRedoButtons();
        return;
    }

    if (editorState.historyIndex < editorState.history.length - 1) {
        editorState.history.splice(editorState.historyIndex + 1);
    }

    if (editorState.history.length > 0 && editorState.history[editorState.historyIndex] === currentStateString) {
        return;
    }

    editorState.history.push(currentStateString);

    if (editorState.history.length > constants.EDITOR_MAX_HISTORY_STATES) {
        editorState.history.shift();
    }
    editorState.historyIndex = editorState.history.length - 1;

    ui.updateUndoRedoButtons();
}

export function applyState(stateString) {
    if (!appState.isEditorInitialized) return;

    let state;
    try {
        state = JSON.parse(stateString);
    } catch (e) {
        console.error("Error parsing scene state:", e);
        ui.showEditorMessageBox("Error loading scene state. Data might be corrupted.", "error");
        return;
    }

    editor.selectObject(null);
    editor.selectLight(null);

    while(editorState.objects.length > 0) {
        const o = editorState.objects.pop();
        if (editorState.transformControls && editorState.transformControls.object === o) editorState.transformControls.detach();
        editorState.scene.remove(o);
        if(o.geometry) o.geometry.dispose();
        if(o.material) o.material.dispose();
    }

    while(editorState.lights.length > 0) {
        const l = editorState.lights.pop();
        if (l.userData.helper) { editorState.scene.remove(l.userData.helper); if(l.userData.helper.dispose) l.userData.helper.dispose(); }
        if (l.target && l.target.parent === editorState.scene) editorState.scene.remove(l.target);
        editorState.scene.remove(l);
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
                    default: geo = new THREE.BoxGeometry(1,1,1); break;
                }
                const matData = d.material || {};
                const mat = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(matData.color || '#cccccc'),
                    emissive: new THREE.Color(matData.emissive || '#000000'),
                    roughness: matData.roughness !== undefined ? matData.roughness : 0.6,
                    metalness: matData.metalness !== undefined ? matData.metalness : 0.2,
                    opacity: matData.opacity !== undefined ? matData.opacity : 1.0,
                    transparent: matData.transparent !== undefined ? matData.transparent : (matData.opacity < 1.0)
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
                editorState.scene.add(o); editorState.objects.push(o);
            } catch (geoError) {
                console.error("Error creating geometry/material for object:", d.name, geoError);
            }
        });
    }

    if (state.lights && Array.isArray(state.lights)) {
        state.lights.forEach(d => {
            let l, h; const c = new THREE.Color(d.color || '#ffffff');
            try {
                switch (d.type) {
                    case 'Point': l = new THREE.PointLight(c, d.intensity, d.distance, d.decay); if(d.position) l.position.fromArray(d.position); h = new THREE.PointLightHelper(l,0.5); break;
                    case 'Directional': l = new THREE.DirectionalLight(c,d.intensity); if(d.position) l.position.fromArray(d.position); if(d.targetPosition && l.target) l.target.position.fromArray(d.targetPosition); if(l.target) editorState.scene.add(l.target); h = new THREE.DirectionalLightHelper(l,1); break;
                    case 'Spot': l = new THREE.SpotLight(c,d.intensity,d.distance,d.angle,d.penumbra,d.decay); if(d.position) l.position.fromArray(d.position); if(d.targetPosition && l.target) l.target.position.fromArray(d.targetPosition); if(l.target) editorState.scene.add(l.target); h = new THREE.SpotLightHelper(l); break;
                    default: break;
                }
                if (l) {
                    l.uuid = d.uuid || THREE.MathUtils.generateUUID();
                    l.name = d.name || 'Light';
                    l.userData.type = d.type;
                    l.castShadow = (d.type !== 'Ambient');
                    if(h){l.userData.helper=h; editorState.scene.add(h); h.visible = true;}
                    editorState.lights.push(l);
                    editorState.scene.add(l);
                }
            } catch (lightError) {
                console.error("Error creating light:", d.name, lightError);
            }
        });
    }

    if (state.camera) {
        editorState.camera.position.fromArray(state.camera.position);
        editorState.orbitControls.target.fromArray(state.camera.target);
        editorState.camera.fov = state.camera.fov;
        editorState.camera.near = state.camera.near;
        editorState.camera.far = state.camera.far;
        editorState.camera.updateProjectionMatrix();
        editorState.orbitControls.update();
        ui.elements.cameraFOV.value = editorState.camera.fov;
        ui.elements.cameraNear.value = editorState.camera.near;
        ui.elements.cameraFar.value = editorState.camera.far;
    }

    if(state.sceneBgColor) {
        editorState.scene.background.setHex(parseInt(state.sceneBgColor, 16));
        ui.elements.sceneBgColor.value = `#${state.sceneBgColor}`;
    }

    if(state.defaultAmbientLightColor && state.defaultAmbientLightIntensity !== undefined){
        editorState.defaultAmbientLight.color.setHex(parseInt(state.defaultAmbientLightColor,16));
        editorState.defaultAmbientLight.intensity = state.defaultAmbientLightIntensity;
        ui.elements.ambientLightColor.value = `#${state.defaultAmbientLightColor}`;
        ui.elements.ambientLightIntensity.value = state.defaultAmbientLightIntensity;
    }

    ui.updateObjectList();
    ui.updateUndoRedoButtons();
}

export function undo() {
    if (editorState.historyIndex > 0) {
        editorState.historyIndex--;
        applyState(editorState.history[editorState.historyIndex]);
        ui.showEditorMessageBox("Undo.", "info", 1000);
    }
}

export function redo() {
    if (editorState.historyIndex < editorState.history.length - 1) {
        editorState.historyIndex++;
        applyState(editorState.history[editorState.historyIndex]);
        ui.showEditorMessageBox("Redo.", "info", 1000);
    }
}