
import { chain } from '@upradata/util';
import path from 'path';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { pathExists, writeJSON } from 'fs-extra';
import { readJsonSync } from './read-json5';
import { OriginalAbsolute } from './types';
import { readdir$ } from './util/common';


export interface Dependency {
    name: string;
    version: string;
}

export class NpmProject {
    static localDependenciesFieldName = 'localDependencies';
    public packageJson: JSONSchemaForNPMPackageJsonFiles;
    public projectPath: OriginalAbsolute;

    constructor(projectPath: string) {
        this.projectPath = {
            original: projectPath,
            absolute: path.resolve(process.cwd(), projectPath)
        };
    }

    public async getPackageJson() {
        if (this.packageJson)
            return this.packageJson;

        const json = await readJsonSync(path.join(this.projectPath.absolute, 'package.json'));
        this.packageJson = json;
        return json;
    }

    public async nodeModulesFiles(): Promise<string[]> {
        return readdir$(this.absolutePath('node_modules')).catch(e => []);
    }

    public checkIsNpmProject() {
        return pathExists(this.absolutePath('package.json'));
    }

    public absolutePath(filepath: string) {
        return path.join(this.projectPath.absolute, filepath);
    }

    public async loadProject() {
        if (await this.checkIsNpmProject())
            return this.getPackageJson();

        throw new Error(`The directory "${this.projectPath}" is not a NPM Project (no package.json found)`);
    }

    public async localDependencyExists(dependency: NpmProject) {
        const projectJson = await this.getPackageJson();
        const localJson = await dependency.getPackageJson();

        return !!projectJson.localDepencies[ localJson.name ];
    }

    public async localDependency(name: string): Promise<Dependency> {
        const projectJson = await this.getPackageJson();
        const dep: string = chain(() => projectJson[ NpmProject.localDependenciesFieldName ][ name ]);

        if (!dep)
            return undefined;

        const [ depName, version ] = dep.split('@');
        return { name: depName, version };
    }

    public async addLocalDependency(dependency: NpmProject) {
        const projectJson = await this.getPackageJson();
        const localJson = await dependency.getPackageJson();

        const localDepField = NpmProject.localDependenciesFieldName;
        projectJson[ localDepField ] = projectJson[ localDepField ] || {};
        projectJson[ localDepField ][ localJson.name ] = dependency.projectPath.absolute + `@${dependency.packageJson.version}`;
    }

    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: '\t' });
    }
}
