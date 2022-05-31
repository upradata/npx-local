import { AppInjector, Component, InjectProp } from '@upradata/dependency-injection';
import { green, red, styles as s, terminal, yellow } from '@upradata/node-util';
import { ifThen } from '@upradata/util';
import { CodifiedError, values } from '@upradata/util';
import { FilesInstaller } from './files-installer';
import { FilesInstallerWatcher } from './files-installer.watcher';
import { Dependency, LocalDependency } from './local-dependency';
import { LocalInstallOptions } from './local-install.options';
import { Logger } from './logger';
import { NpmPackage, NpmPackageDependency } from './npm-package';
import { DependencyName, isSkipped, SemVersionType, Skipped } from './types';
import { dependenciesDef, getDependencyName } from './util';


export type InstalledLocalDependency = { npmPackageDependency: NpmPackageDependency; npmPackage: NpmPackage; } | Skipped;

@Component()
export class LocalInstall {
    @InjectProp(Logger) private logger: Logger;
    public options: LocalInstallOptions;
    private filesInstallerByProject = new Map<NpmPackage, FilesInstaller>();


    constructor(options?: LocalInstallOptions) {
        this.options = Object.assign(new LocalInstallOptions(), options);

        AppInjector.init({
            providers: [
                { provide: LocalInstallOptions, useValue: this.options }
            ]
        });
    }

    public async install() {
        try {
            if (this.options.localPackages.length > 0)
                await this.addLocalDepedencies();
            else
                await this.installLocalDependenciesFromPackageJson();

        } catch (e) {
            handlerError(e);
        }
    }

    public async getLocalDependencies(npmPackage: NpmPackage) {
        await npmPackage.loadProject();
        type Deps = { depName: DependencyName; dependency: Dependency; }[];
        const packageJson = await npmPackage.getPackageJson();

        const dependencies = dependenciesDef.filter(({ depName }) => !!packageJson.local[ depName ]).reduce((deps, { depName }) => [
            ...deps,
            ...values(packageJson.local[ depName ]).map(d => ({
                depName,
                dependency: d
            })) ], [] as Deps);


        return dependencies.map(({ depName, dependency }) => new LocalDependency(dependency, { dependencyName: depName }));
    }

    public async installLocalDependenciesFromPackageJson(): Promise<void> {
        const npmPackage = new NpmPackage(this.options.projectDir);
        const localDeps = await this.getLocalDependencies(npmPackage);

        if (localDeps.length === 0) {
            this.logger.log(s.yellow.full.bold.args.$`No ${'local.dependencies'} found in package.json of "${npmPackage.packageJson.json.name}"`);
            return;
        }

        return this.installLocalDependencies(localDeps);
    }


    async updateLatest() {
        return this.installLocalDependenciesFromPackageJson();
    }

    public addLocalDepedencies(): Promise<void> {
        return this.installLocalDependencies(this.options.localPackages.map(l =>
            new LocalDependency({
                path: typeof l === 'string' ? l : l.path,
                installDir: this.options.installDir
            }, { mode: typeof l === 'string' ? undefined : l.mode || this.options.mode, dependencyName: getDependencyName(this.options.dependencyType) }))
        );
    }

    public async installLocalDependencies(dependencies: LocalDependency[]): Promise<void> {

        if (!dependencies || dependencies.length === 0)
            return Promise.resolve();

        const npmPackage = new NpmPackage(this.options.projectDir);
        await npmPackage.addDependency(...dependencies);

        const installedPackages = await this.doInstallPackageLocalDependencies(npmPackage);

        this.logger.log();

        await Promise.all(installedPackages.map(async result => {
            if (isSkipped(result)) {
                const { reason } = result;
                console.warn(yellow`- Skipped: "${reason}"`);
                return;
            }

            const { npmPackage, npmPackageDependency: dependency } = result;

            await dependency.package.writePackageJson();
            await npmPackage.writePackageJson();

            this.logger.log(s.oneLine.blue.bold.full.underline.args.$`
                    - Package "${dependency.package.packageJson.json.name}" installed in "${npmPackage.packageJson.json.name}"
                      "[package.json].local.${dependency.localDependency.dependencyName}" (mode: ${dependency.localDependency.mode})`
            );
        }));

        this.logger.log();

        if (this.options.watch) {
            this.logger.log('\n');
            return this.startWatch();
        }
    }

    private async startWatch(): Promise<void> {

        await Promise.all([ ...this.filesInstallerByProject ].map(([ npmProject, filesInstaller ]) => {
            this.logger.log(s.green.bold.$`Start watching ${npmProject.packageJson.json.name}`);
            return new FilesInstallerWatcher(filesInstaller).startWatch();
        }));

        this.logger.log('\n');
    }

    /*  private async _installLocalDependencies(npmProjectDependencies: NpmProjectDependencies): Promise<Array<InstalledLocalDependency[]>> {
         const installDepsPromises: Promise<InstalledLocalDependency[]>[] = [];

         for (const [ project, dependencies ] of npmProjectDependencies.dependencies)
             installDepsPromises.push(this._installProjectLocalDependencies(project));


         return Promise.all(installDepsPromises);
     } */

    private async doInstallPackageLocalDependencies(npmPackage: NpmPackage): Promise<InstalledLocalDependency[]> {

        await npmPackage.loadProject();

        return Promise.all(Object.entries(npmPackage.dependencies).map(async ([ npmDepName, dependency ]) => {

            const npmDepPackage = dependency.package;
            await npmDepPackage.loadProject();

            const filesInstaller = new FilesInstaller({
                npmPackage,
                dependency: new NpmPackage(dependency.package.absolutePath()),
                mode: dependency.localDependency.mode,
                verbose: this.options.verbose,
                installDir: dependency.localDependency.installDir
            });

            this.filesInstallerByProject.set(npmDepPackage, filesInstaller);
            const filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();

            /*  if (await dependency.isInstalledIn(project)) {

                 for (const [ key, file ] of filesToBeInstalled) {
                     // install only what does not exist already
                     const fileDest = path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.relative));

                     // THIS IS WRONG => to do => change is file exists and it is not a symlink
                     if (path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.relative)) === fileDest)
                         filesToBeInstalled.delete(key);
                 }

                 if (filesToBeInstalled.size === 0) {
                     if (!this.options.force)
                         return { skipped: true, reason: `${depProject.packageJson.json.name} is already installed with the latest version ${dep.version}` };


                     // reinstall all
                     filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();
                     this.logger.log(yellow`${depProject.packageJson.json.name} will be reinstalled by force`);
                 }
             } */


            if (filesToBeInstalled.size === 0)
                console.warn(yellow`${npmDepPackage.packageJson.json.name} has no file to be copied`);
            else
                await filesInstaller.copyFiles(filesToBeInstalled);

            if (this.options.verbose) {
                filesInstaller.logInstalledFiles();
                this.logger.log('\n');
            }

            // add localDependencies project in package.json
            await npmPackage.addLocalDependency(npmDepName);

            return { npmPackage, npmPackageDependency: dependency };
        }));
    }


    async copyLocalDepsToNpmProperty() {
        try {
            await this.updateLatest();
            const { projectDir } = this.options;

            const npmPackage = new NpmPackage(projectDir);

            const depNames = await npmPackage.copyLocalDependencyToNpmDependencies();
            await npmPackage.writePackageJson();

            const title = terminal.title(`Dependencies installed`, {
                style: s.white.bold.bgMagenta.transform,
                bgStyle: s.bgMagenta.transform,
                type: 'band'
            });

            this.logger.log(`\n${title}\n`);
            this.logger.log('Packages installed:\n');

            const indent = '    - ';

            for (const dep of depNames)
                this.logger.log(green`${indent}"${dep}"`);

            this.logger.log();
        } catch (e) {
            handlerError(e);
        }
    }

    async bumpVersion(options: { semVer?: SemVersionType; version?: string; }) {
        const { semVer, version } = options;

        const npmPackage = new NpmPackage(this.options.projectDir);
        const packageJson = await npmPackage.getPackageJson();
        const oldVersion = packageJson.version;

        if (version) {
            packageJson.version = version;
        } else {
            const [ major, minor, patch ] = packageJson.version.split('.').map(s => parseInt(s, 10));
            const makeSemVer = (major: string | number, minor: string | number, patch: string | number) => `${major}.${minor}.${patch}`;

            const newVersion = ifThen()
                .next({ if: semVer === 'major', then: makeSemVer(major + 1, minor, patch) })
                .next({ if: semVer === 'minor', then: makeSemVer(major, minor + 1, patch) })
                .next({ if: semVer === 'patch', then: makeSemVer(major, minor, patch + 1) }).value;

            packageJson.version = newVersion;
        }

        await npmPackage.writePackageJson();
        this.logger.log(s.green.args.bold.full.$`Version bumped from ${oldVersion} ⟶  ${packageJson.version}`);
    }
}


const handlerError = (e: any) => {
    if (e instanceof CodifiedError) {
        console.error(red`${e.message}`);
    } else {
        if (e instanceof Error)
            console.error(red`${typeof e === 'string' ? e : `"${e.message}"\n${e.stack}`}`);
        else
            console.error(red`${e?.message || JSON.stringify(e)}`);
    }
};
