import { NpmProject } from './node-project';
import { LocalDependency } from './local-dependency';

export interface NpmProjectDependency {
    project: NpmProject;
    localDependency: LocalDependency;
}

export class NpmProjectDependencies {
    public dependencies = new Map<NpmProject, NpmProjectDependency[]>();

    constructor() { }

    public addDependency(npmProject: NpmProject, ...dependencies: LocalDependency[]) {
        this.dependencies.set(npmProject, dependencies.map(d => {
            const project = new NpmProject(d.sourcePath);

            if (!project.isLocalPackage())
                console.warn(`Skip not local package ${project.projectPath}`);
            else
                return { project, localDependency: d };
        }));
    }

    public getDependencies(npmProject: NpmProject) {
        return this.dependencies.get(npmProject);
    }
}
