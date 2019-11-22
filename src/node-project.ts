
import path from 'path';
import { writeJSON } from 'fs-extra';
import { OriginalAbsolute } from './types';
import { LocalInstallPackageJson } from './package-json';
import { readdir$ } from './util/promisify';


export interface Dependency {
    name: string;
    version: string;
}

export class NpmProject {
    public packageJson: LocalInstallPackageJson;
    public projectPath: OriginalAbsolute;


    constructor(projectPath: string) {
        this.projectPath = {
            original: projectPath,
            absolute: path.resolve(process.cwd(), projectPath)
        };

        this.packageJson = new LocalInstallPackageJson(this.projectPath.absolute);
    }

    public async getPackageJson(force?: boolean) {
        return this.packageJson.readJson(force);
    }

    public async nodeModulesFiles(): Promise<string[]> {
        return readdir$(this.absolutePath('node_modules')).catch(e => []);
    }

    public absolutePath(...filepaths: string[]) {
        return path.join(this.projectPath.absolute, ...filepaths);
    }

    public originalPath(...filepaths: string[]) {
        return path.join(this.projectPath.original, ...filepaths);
    }

    public path(...filepaths: string[]): OriginalAbsolute {
        return {
            absolute: this.absolutePath(...filepaths),
            original: this.originalPath(...filepaths)
        };
    }

    public get nodeModulesPath(): OriginalAbsolute {
        return this.path('node_modules');
    }

    public async loadProject() {
        return this.packageJson.load();
    }

    public async localDependencyExists(dependency: NpmProject) {
        const projectJson = await this.getPackageJson();
        const localJson = await dependency.getPackageJson();

        return !!projectJson.localDepencies[ localJson.name ];
    }

    public async localDependency(name: string): Promise<Dependency> {
        const dep: string = (await this.packageJson.localProp('dependencies'))[ name ];

        if (!dep)
            return undefined;

        const [ depName, version ] = dep.split('@');
        return { name: depName, version };
    }

    public async addLocalDependency(dependency: NpmProject) {
        const projectJson = await this.getPackageJson();
        const depJson = await dependency.getPackageJson();

        const projectDeps = await this.packageJson.localProp('dependencies').async;
        const depUsedBy = await dependency.packageJson.localProp('usedBy').async;

        projectDeps[ depJson.name ] = dependency.projectPath.absolute + `@${dependency.packageJson.json.version}`;
        depUsedBy[ projectJson.name ] = this.projectPath.absolute;
    }

    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: '\t' });
    }
}
