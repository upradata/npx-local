import { writeJSON } from 'fs-extra';
import path from 'path';
import { yellow } from '@upradata/node-util';
import { entries, ObjectOf } from '@upradata/util';
import { LocalDependency } from './local-dependency';
import { NpmProjectDependency } from './npmproject-dependencies';
import { LocalInstallPackageJson } from './package-json';
import { RelativeAbsolute } from './types';
import { relativeAbsolutPath } from './util';
import { NpmPackageProperties } from './local-install.options';


export class NpmProject {
    public packageJson: LocalInstallPackageJson;
    public projectPath: RelativeAbsolute;
    public _installDir: string;


    constructor(projectPath: string, public dependencies?: ObjectOf<NpmProjectDependency>) {
        this.projectPath = relativeAbsolutPath(projectPath);
        this.packageJson = new LocalInstallPackageJson(this.projectPath.absolute);
    }

    /* public isLocalPackage() {
        return !path.isAbsolute(this.projectPath.relative);
    } */


    public async getPackageJson(force?: boolean) {
        return this.packageJson.readJson(force);
    }


    public absolutePath(...filepaths: string[]) {
        if (filepaths.length === 1 && path.isAbsolute(filepaths[ 0 ]))
            return filepaths[ 0 ];

        return path.join(this.projectPath.absolute, ...filepaths);
    }

    public relativePath(...filepaths: string[]) {
        return path.join(this.projectPath.relative, ...filepaths);
    }

    public path(...filepaths: string[]): RelativeAbsolute {
        return {
            absolute: this.absolutePath(...filepaths),
            relative: this.relativePath(...filepaths)
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

    public async localDependency(name: string): Promise<LocalDependency> {
        const dep = (await this.packageJson.localProp('dependencies').async)[ name ];

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


        projectDeps[ depJson.name ] = dep.unparse();
        depUsedBy[ projectJson.name ] = this.projectPath.absolute;
    }

    public async copyLocalDependencyToNpmDependencies(where: NpmPackageProperties = 'dependencies'): Promise<string[]> {
        await this.loadProject();

        const { dependencies = {} } = this.packageJson.json.local;
        this.packageJson.json[ where ] = this.packageJson.json[ where ] || {};

        const depNames = entries(dependencies).map(([ name, dep ]) => {
            const { version } = new LocalDependency(dep);

            this.packageJson.json[ where ][ name ] = `^${version}`;
            return name as string;
        });

        return depNames;
    }

    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: '\t' });
    }
}
