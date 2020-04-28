import { NpmProject } from './node-project';
import { LocalDependency } from './local-dependency';
import { ObjectOf } from '@upradata/util';
import { readdir$ } from './util/promisify';

export class NpmProjectDependency {

    constructor(public project: NpmProject, public localDependency: LocalDependency) { }

    async isInstalledIn(project: NpmProject) {
        const packageJson = await this.project.getPackageJson();

        const splits = packageJson.name.split('/');
        const dir = splits.slice(0, -1).join('/');
        const name = splits[ splits.length - 1 ];

        const installedFiles = await readdir$(this.project.absolutePath(this.localDependency.installDir, dir)).catch(e => []);

        const localDep = await project.localDependencyInPackageJson(packageJson.name);

        if (!localDep)
            return false;

        return localDep.version === packageJson.version && installedFiles.includes(name);
    }
}

export class NpmProjectDependencies {
    public dependencies = new Map<NpmProject, ObjectOf<NpmProjectDependency>>();

    constructor() { }

    public async addDependency(npmProject: NpmProject, ...dependencies: LocalDependency[]) {
        const deps = await Promise.all(dependencies.map(async d => {
            const project = new NpmProject(d.sourcePath);

            if (!project.isLocalPackage())
                console.warn(`Skip not local package ${project.projectPath}`);
            else
                return {
                    name: (await project.getPackageJson()).name,
                    projectDependency: new NpmProjectDependency(project, d)
                };
        }));

        const projectDependencies: ObjectOf<NpmProjectDependency> = {} as any;

        for (const dep of deps)
            projectDependencies[ dep.name ] = dep.projectDependency;

        this.dependencies.set(npmProject, projectDependencies);
        npmProject.dependencies = projectDependencies;
    }

    public getDependencies(npmProject: NpmProject) {
        return this.dependencies.get(npmProject);
    }
}
