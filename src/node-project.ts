
import path from 'path';
import { writeJSON } from 'fs-extra';
import { OriginalAbsolute } from './types';
import { LocalInstallPackageJson } from './package-json';
import { LocalDependency } from './local-dependency';
import { NpmProjectDependency } from './npmproject-dependencies';
import { ObjectOf } from '@upradata/util';
import { yellow } from './util/colors';


export class NpmProject {
    public packageJson: LocalInstallPackageJson;
    public projectPath: OriginalAbsolute;
    public _installDir: string;


    constructor(projectPath: string, public dependencies?: ObjectOf<NpmProjectDependency>) {
        this.projectPath = {
            original: projectPath,
            absolute: path.resolve(process.cwd(), projectPath)
        };

        this.packageJson = new LocalInstallPackageJson(this.projectPath.absolute);
    }

    public isLocalPackage() {
        return /^(\.|\/)/.test(this.projectPath.original);
    }


    public async getPackageJson(force?: boolean) {
        return this.packageJson.readJson(force);
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

    public async loadProject() {
        return this.packageJson.load();
    }

    public async localDependencyExists(dependency: NpmProject) {
        const projectJson = await this.getPackageJson();
        const localJson = await dependency.getPackageJson();

        return !!projectJson.localDepencies[ localJson.name ];
    }

    public async localDependencyInPackageJson(name: string): Promise<LocalDependency> {
        const dep: string = (await this.packageJson.localProp('dependencies').async)[ name ];

        if (!dep)
            return undefined;

        return new LocalDependency(dep);
    }

    public async addLocalDependency(dependencyName: string) {
        const projectDependency = this.dependencies[ dependencyName ];
        if (!projectDependency) {
            console.warn(yellow`${this.packageJson.json.name} has no dependency called "${dependencyName}"`);
            return;
        }

        const dependency = projectDependency.project;
        const { mode, installDir } = projectDependency.localDependency;

        const projectJson = await this.getPackageJson();
        const depJson = await dependency.getPackageJson();

        const projectDeps = await this.packageJson.localProp('dependencies').async;
        const depUsedBy = await dependency.packageJson.localProp('usedBy').async;


        const dep = new LocalDependency(
            { installDir, path: dependency.projectPath.absolute },
            { version: dependency.packageJson.json.version, mode }
        );


        projectDeps[ depJson.name ] = dep.packageJsonPath();
        depUsedBy[ projectJson.name ] = this.projectPath.absolute;
    }

    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: '\t' });
    }
}
