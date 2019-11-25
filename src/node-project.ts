
import path from 'path';
import { writeJSON } from 'fs-extra';
import { OriginalAbsolute } from './types';
import { LocalInstallPackageJson } from './package-json';
import { readdir$ } from './util/promisify';
import { LocalDependency } from './local-dependency';
import { InstallMode } from './local-install.options';


export class NpmProject {
    public packageJson: LocalInstallPackageJson;
    public projectPath: OriginalAbsolute;
    public _installDir: string;


    constructor(projectPath: string, public mode?: InstallMode) {
        this.projectPath = {
            original: projectPath,
            absolute: path.resolve(process.cwd(), projectPath)
        };

        this.packageJson = new LocalInstallPackageJson(this.projectPath.absolute);
    }

    public isLocalPackage() {
        return /^(\.|\/)/.test(this.projectPath.original);
    }

    public get installDir() {
        if (!this._installDir)
            throw new Error(`Project in ${this.projectPath.absolute} is not an installation project`);

        return this._installDir;
    }

    public set installDir(installDir: string) {
        this._installDir = installDir;
    }

    public async getPackageJson(force?: boolean) {
        return this.packageJson.readJson(force);
    }

    public async filesInInstallDir(installDir?: string): Promise<string[]> {
        return readdir$(this.absolutePath(installDir || this.installDir)).catch(e => []);
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

    public get installDirPath(): OriginalAbsolute {
        return this.path(this.installDir);
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

    public async addLocalDependency(args: { dependency: NpmProject, installDir: string; }) {
        const { dependency, installDir } = args;

        const projectJson = await this.getPackageJson();
        const depJson = await dependency.getPackageJson();

        const projectDeps = await this.packageJson.localProp('dependencies').async;
        const depUsedBy = await dependency.packageJson.localProp('usedBy').async;


        const dep = await this.localDependencyInPackageJson(depJson.name) ||
            new LocalDependency(
                { installDir, path: dependency.projectPath.absolute },
                { version: dependency.packageJson.json.version, mode: this.mode }
            );


        projectDeps[ depJson.name ] = dep.packageJsonPath();
        depUsedBy[ projectJson.name ] = this.projectPath.absolute;
    }

    public async writePackageJson() {
        return writeJSON(this.absolutePath('package.json'), await this.getPackageJson(), { spaces: '\t' });
    }
}
