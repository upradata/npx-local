
import { chain } from '@upradata/util';
import path from 'path';
import { pathExists, writeJSON } from 'fs-extra';
import { readJsonAsync } from './read-json5';
import { OriginalAbsolute } from './types';
import { readdir$ } from './util/common';
import { LocalInstallPackageJson } from './package-json';


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

    public async getPackageJson() {
        return this.packageJson.readJson();
    }

    public async nodeModulesFiles(): Promise<string[]> {
        return readdir$(this.absolutePath('node_modules')).catch(e => []);
    }

    public absolutePath(filepath: string) {
        return path.join(this.projectPath.absolute, filepath);
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
