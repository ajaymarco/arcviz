import { state } from './state.js';
import * as THREE from 'three';

class ProjectManager {
  constructor() {
    this.projects = {};
    this.currentProject = null;
  }

  createProject(name) {
    this.projects[name] = {
      name: name,
      data: null,
      createdAt: new Date()
    };
    this.currentProject = name;
  }

  saveProjectData(data) {
    if (this.currentProject) {
      this.projects[this.currentProject].data = data;
    }
  }

  loadProjectData(name) {
    if (this.projects[name]) {
      this.currentProject = name;
      return this.projects[name].data;
    }
    return null;
  }

  getCurrentProject() {
    return this.projects[this.currentProject];
  }
}

export const projectManager = new ProjectManager();