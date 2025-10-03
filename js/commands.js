/**
 * @fileoverview This file implements the Command pattern for undo/redo functionality.
 * Each user action is encapsulated as a command object.
 */

import * as THREE from 'three';
import { editor } from './editor.js';
import { editorState } from './state.js';
import { ui } from './ui.js';

/**
 * Base class for all commands.
 * @param {string} name - The name of the command.
 */
export class Command {
    constructor(name) {
        this.name = name;
        this.id = THREE.MathUtils.generateUUID();
    }

    /**
     * Executes the command. This method should be implemented by subclasses.
     */
    execute() {
        throw new Error("Command.execute() must be implemented by a subclass.");
    }

    /**
     * Undoes the command. This method should be implemented by subclasses.
     */
    undo() {
        throw new Error("Command.undo() must be implemented by a subclass.");
    }
}

/**
 * Command to add a new object to the scene.
 * @param {THREE.Object3D} object - The object to add.
 */
export class AddObjectCommand extends Command {
    constructor(object) {
        super('Add Object');
        this.object = object;
    }

    execute() {
        editorState.scene.add(this.object);
        editorState.objects.push(this.object);
        editor.selectObject(this.object);
        ui.updateObjectList();
    }

    undo() {
        editor.selectObject(null);
        editorState.scene.remove(this.object);
        const index = editorState.objects.indexOf(this.object);
        if (index > -1) {
            editorState.objects.splice(index, 1);
        }
        ui.updateObjectList();
    }
}

/**
 * Command to delete an object from the scene.
 * @param {THREE.Object3D} object - The object to delete.
 */
export class DeleteObjectCommand extends Command {
    constructor(object) {
        super('Delete Object');
        this.object = object;
    }

    execute() {
        editor.selectObject(null);
        editorState.scene.remove(this.object);
        const index = editorState.objects.indexOf(this.object);
        if (index > -1) {
            editorState.objects.splice(index, 1);
        }
        ui.updateObjectList();
    }

    undo() {
        editorState.scene.add(this.object);
        editorState.objects.push(this.object);
        editor.selectObject(this.object);
        ui.updateObjectList();
    }
}

/**
 * Command to update the transformation (position, rotation, scale) of an object.
 * @param {THREE.Object3D} object - The object to transform.
 * @param {object} newTransform - The new transformation properties.
 * @param {object} oldTransform - The old transformation properties.
 */
export class UpdateTransformCommand extends Command {
    constructor(object, newTransform, oldTransform) {
        super('Update Transform');
        this.object = object;
        this.newTransform = newTransform;
        this.oldTransform = oldTransform;
    }

    execute() {
        this.object.position.copy(this.newTransform.position);
        this.object.rotation.copy(this.newTransform.rotation);
        this.object.scale.copy(this.newTransform.scale);
        this.object.updateMatrixWorld();
        editor.updateTransformControls();
    }

    undo() {
        this.object.position.copy(this.oldTransform.position);
        this.object.rotation.copy(this.oldTransform.rotation);
        this.object.scale.copy(this.oldTransform.scale);
        this.object.updateMatrixWorld();
        editor.updateTransformControls();
    }
}

/**
 * Command to add a new light to the scene.
 * @param {THREE.Light} light - The light to add.
 */
export class AddLightCommand extends Command {
    constructor(light) {
        super('Add Light');
        this.light = light;
    }

    execute() {
        editorState.scene.add(this.light);
        if (this.light.userData.helper) {
            editorState.scene.add(this.light.userData.helper);
        }
        editorState.lights.push(this.light);
        editor.selectLight(this.light);
        ui.updateObjectList();
    }

    undo() {
        editor.selectLight(null);
        editorState.scene.remove(this.light);
        if (this.light.userData.helper) {
            editorState.scene.remove(this.light.userData.helper);
        }
        const index = editorState.lights.indexOf(this.light);
        if (index > -1) {
            editorState.lights.splice(index, 1);
        }
        ui.updateObjectList();
    }
}

/**
 * Command to delete a light from the scene.
 * @param {THREE.Light} light - The light to delete.
 */
export class DeleteLightCommand extends Command {
    constructor(light) {
        super('Delete Light');
        this.light = light;
    }

    execute() {
        editor.selectLight(null);
        editorState.scene.remove(this.light);
        if (this.light.userData.helper) {
            editorState.scene.remove(this.light.userData.helper);
        }
        const index = editorState.lights.indexOf(this.light);
        if (index > -1) {
            editorState.lights.splice(index, 1);
        }
        ui.updateObjectList();
    }

    undo() {
        editorState.scene.add(this.light);
        if (this.light.userData.helper) {
            editorState.scene.add(this.light.userData.helper);
        }
        editorState.lights.push(this.light);
        editor.selectLight(this.light);
        ui.updateObjectList();
    }
}