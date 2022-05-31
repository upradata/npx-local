import { writeJSON } from 'fs-extra';
import path from 'path';
import { yellow } from '@upradata/node-util';
import { entries, makeObject, ObjectOf } from '@upradata/util';
import { LocalDependency } from './local-dependency';
import { LocalInstallPackageJson } from './package-json';
import { DependencyName, RelativeAbsolute } from './types';
import { dependenciesDef, relativeAbsolutPath } from './util';


export type NpmPackageDependency = {
    package: NpmPackage;
    localDependency: LocalDependency;
};


export class NpmPackage {
    public packageJson: LocalInstallPackageJson;
    public projectPath: RelativeAbsolute;
    public dependencies: ObjectOf<NpmPackageDependency> = {};

    constructor(projectPath: string) {
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

    public async addDependency(...dependencies: LocalDependency[]) {
        const deps = (await Promise.all(dependencies.map(async d => {
            const npmPackage = new NpmPackage(d.sourcePath);

            return {
                name: (await npmPackage.getPackageJson()).name,
                packageDependency: { package: npmPackage, localDependency: d } as NpmPackageDependency
            };
        }))).filter(v => !!v);

        const npmPackageDependencies = makeObject(deps, dep => ({ key: dep.name, value: dep.packageDependency }));
        this.dependencies = { ...this.dependencies, ...npmPackageDependencies };
    }

    public async localDependencyExists(dependency: NpmPackage, dependencyName: DependencyName) {
        const packageJson = await this.getPackageJson();
        const depPackageJson = await dependency.getPackageJson();

        return !!packageJson.local[ dependencyName ][ depPackageJson.name ];
    }

    public async localDependency(name: string, dependencyName: DependencyName): Promise<LocalDependency> {
        const dep = (await this.packageJson.localProp(dependencyName).async)[ name ];

        if (!dep)
            return undefined;

        return new LocalDependency(dep, { dependencyName });
    }

    public async addLocalDependency(name: string) {
        const projectDependency = this.dependencies[ name ];

        if (!projectDependency) {
            console.warn(yellow`${this.packageJson.json.name} has no dependency called "${name}"`);
            return;
        }

        const dependency = projectDependency.package;
        const { mode, installDir, dependencyName } = projectDependency.localDependency;

        const projectJson = await this.getPackageJson();
        const depJson = await dependency.getPackageJson();

        const projectDeps = await this.packageJson.localProp(dependencyName).async;
        const depUsedBy = await dependency.packageJson.localProp('usedBy').async;


        const dep = new LocalDependency(
            { installDir, path: dependency.projectPath.absolute },
            { version: depJson.version, mode, dependencyName }
        );

        projectDeps[ depJson.name ] = dep.unparse();
        depUsedBy[ projectJson.name ] = this.projectPath.absolute;
    }

    public async copyLocalDependencyToNpmDependencies(): Promise<string[]> {
        await this.loadProject();

        return dependenciesDef.flatMap(({ depName }) => {

            const dependency = this.packageJson.json.local[ depName ] || {};

            this.packageJson.json[ depName ] = this.packageJson.json[ depName ] || {};

            const depNames = entries(dependency).map(([ name, dep ]) => {
                const { version } = new LocalDependency(dep);

                this.packageJson.json[ depName ][ name ] = `^${version}`;
                return name as string;
            });

            return depNames;
        });
    }


    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: 4 });
    }
}
