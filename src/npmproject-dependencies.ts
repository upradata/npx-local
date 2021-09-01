import { makeObject, ObjectOf } from '@upradata/util';
import { LocalDependency } from './local-dependency';
import { NpmProject } from './node-project';


export class NpmProjectDependency {

    constructor(public project: NpmProject, public localDependency: LocalDependency) { }

    /* async isInstalledIn(project: NpmProject) {
        WRONG ANYWAY !!!!

        const packageJson = await this.project.getPackageJson();

        const splits = packageJson.name.split('/');
        const dir = splits.slice(0, -1).join('/');
        const name = splits[ splits.length - 1 ];

        const installedFiles = await fs.readdir(this.project.absolutePath(this.localDependency.installDir, dir)).catch(_e => []);

        const localDep = await project.localDependency(packageJson.name);

        if (!localDep)
            return false;

        return localDep.version === packageJson.version && installedFiles.includes(name);
    } */
}


export class NpmProjectDependencies {
    public dependencies = new Map<NpmProject, ObjectOf<NpmProjectDependency>>();

    constructor() { }

    public async addDependency(npmProject: NpmProject, ...dependencies: LocalDependency[]) {
        const deps = (await Promise.all(dependencies.map(async d => {
            const project = new NpmProject(d.sourcePath);

            return {
                name: (await project.getPackageJson()).name,
                projectDependency: new NpmProjectDependency(project, d)
            };
        }))).filter(v => !!v);

        const projectDependencies = makeObject(deps, dep => ({ key: dep.name, value: dep.projectDependency }));

        this.dependencies.set(npmProject, projectDependencies);
        npmProject.dependencies = projectDependencies;
    }

    public getDependencies(npmProject: NpmProject) {
        return this.dependencies.get(npmProject);
    }
}
