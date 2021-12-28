import { green, red, styles as s, terminal, yellow } from '@upradata/node-util';
import { CodifiedError, values } from '@upradata/util';
import { AppInjector, Component, InjectProp } from '@upradata/dependency-injection';
import { FilesInstaller } from './files-installer';
import { FilesInstallerWatcher } from './files-installer.watcher';
import { LocalDependency } from './local-dependency';
import { LocalInstallOptions } from './local-install.options';
import { NpmProject } from './node-project';
import { NpmProjectDependencies, NpmProjectDependency } from './npmproject-dependencies';
import { FromTo, isSkipped, Skipped } from './types';
import { Logger } from './logger';


export type InstalledLocalDependency = FromTo<NpmProjectDependency, NpmProject> | Skipped;

@Component()
export class LocalInstall {
    @InjectProp(Logger) private logger: Logger;
    public options: LocalInstallOptions;
    private filesInstallerByProject = new Map<NpmProject, FilesInstaller>();


    constructor(options: LocalInstallOptions) {
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

    public async installLocalDependenciesFromPackageJson(): Promise<void> {
        const npmProject = new NpmProject(this.options.projectDir);
        await npmProject.loadProject();

        const dependencies = values(npmProject.packageJson.localProp('dependencies').sync);

        const localDeps = dependencies.map(d => new LocalDependency(d));

        if (localDeps.length === 0) {
            this.logger.log(s.yellow.full.bold.args.$`No ${'local.dependencies'} found in package.json of "${npmProject.packageJson.json.name}"`);
            return;
        }

        return this.installLocalDependencies(localDeps);
    }

    public addLocalDepedencies(): Promise<void> {
        return this.installLocalDependencies(this.options.localPackages.map(l =>
            new LocalDependency({
                path: typeof l === 'string' ? l : l.path,
                installDir: this.options.installDir
            }, { mode: typeof l === 'string' ? undefined : l.mode || this.options.mode }))
        );
    }

    public async installLocalDependencies(dependencies: LocalDependency[]): Promise<void> {

        if (!dependencies || dependencies.length === 0)
            return Promise.resolve();

        const npmProjectDependencies = new NpmProjectDependencies();
        const project = new NpmProject(this.options.projectDir);

        await npmProjectDependencies.addDependency(project, ...dependencies);

        const installedProjects = await this.doInstallProjectLocalDependencies(project);

        this.logger.log();

        await Promise.all(installedProjects.map(async result => {
            if (isSkipped(result)) {
                const { reason } = result;
                console.warn(yellow`- Skipped: "${reason}"`);
                return;
            }

            const { from, to } = result;

            await from.project.writePackageJson();
            await to.writePackageJson();

            this.logger.log(s.oneLine.blue.bold.full.underline.args.$`
                    - Package "${from.project.packageJson.json.name}" installed in "${to.packageJson.json.name}"
                      "[package.json].local.dependencies" (mode: ${from.localDependency.mode})`
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

    private async doInstallProjectLocalDependencies(project: NpmProject): Promise<InstalledLocalDependency[]> {

        await project.loadProject();

        return Promise.all(Object.entries(project.dependencies).map(async ([ depName, dependency ]) => {

            const depProject = dependency.project;
            await depProject.loadProject();

            const filesInstaller = new FilesInstaller({
                project,
                dependency: new NpmProject(dependency.project.absolutePath()),
                mode: dependency.localDependency.mode,
                verbose: this.options.verbose,
                installDir: dependency.localDependency.installDir
            });

            this.filesInstallerByProject.set(depProject, filesInstaller);
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
                console.warn(yellow`${depProject.packageJson.json.name} has no file to be copied`);
            else
                await filesInstaller.copyFiles(filesToBeInstalled);

            if (this.options.verbose) {
                filesInstaller.logInstalledFiles();
                this.logger.log('\n');
            }

            // add localDependencies project in package.json
            await project.addLocalDependency(depName);

            return { from: dependency, to: project };
        }));
    }


    async copyLocalDepsToNpmProperty() {
        try {
            const { projectDir, npmPropertyToCopyLocalDeps } = this.options;

            const project = new NpmProject(projectDir);

            const depNames = await project.copyLocalDependencyToNpmDependencies(npmPropertyToCopyLocalDeps);
            await project.writePackageJson();

            const title = terminal.title(`Dependencies installed in "${npmPropertyToCopyLocalDeps}"`, {
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
