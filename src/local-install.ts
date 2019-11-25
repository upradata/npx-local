
import { red, colors, yellow } from './util/colors';
import { NpmProject } from './node-project';
import { FilesInstaller } from './files-installer';
import { Skipped, isSkipped, FromTo } from './types';
import { LocalInstallOptions, LocalPackage } from './local-install.options';
import path from 'path';
import { LocalDependency } from './local-dependency';
import { NpmProjectDependencies, NpmProjectDependency } from './npmproject-dependencies';

export type InstalledLocalDependency = FromTo<NpmProjectDependency, NpmProject> | Skipped;


export class LocalInstall {
    public options: LocalInstallOptions<LocalPackage>;
    private filesInstallerByProject = new Map<NpmProject, FilesInstaller>();


    constructor(options: LocalInstallOptions<LocalPackage>) {
        this.options = Object.assign(new LocalInstallOptions(), options);
    }

    public install() {
        if (this.options.localPackages.length > 0)
            return this.installLocalDepedenciesFromArgv();

        return this.installLocalDependenciesFromPackageJson();
    }

    public async installLocalDependenciesFromPackageJson(): Promise<void> {
        const npmProject = new NpmProject(this.options.projectDir);
        const packageJson = await npmProject.loadProject();
        const localDeps = Object.values(packageJson.local.dependencies).map(d => new LocalDependency(d));

        if (!localDeps)
            return console.log(yellow`No localDependencies found in ${npmProject.packageJson.json.name} package.json`);

        return this.installLocalDependencies(localDeps.map(d => {
            d.sourcePath = path.relative(process.cwd(), d.sourcePath);
            return d;
        }));

    }

    public installLocalDepedenciesFromArgv(): Promise<void> {
        return this.installLocalDependencies(this.options.localPackages.map(l =>
            new LocalDependency({
                path: l.mode ? `${l.mode}:${l.path}` : l.path,
                installDir: this.options.installDir
            }, { mode: this.options.mode }))
        );
    }

    public async installLocalDependencies(dependencies: LocalDependency[]): Promise<void> {
        try {
            if (!dependencies || dependencies.length === 0)
                return Promise.resolve();

            const npmProjectDependencies = new NpmProjectDependencies();
            const project = new NpmProject(this.options.projectDir);

            npmProjectDependencies.addDependency(project, ...dependencies);

            const installedProjects = await this._installProjectLocalDependencies(project, npmProjectDependencies.getDependencies(project));

            await Promise.all([]);
            await project.writePackageJson();

            const donePromises: Promise<void>[] = [];

            for (const result of installedProjects) {
                if (isSkipped(result)) {
                    const { reason } = result;
                    console.log(yellow`    - ${reason}`);
                } else {
                    const { from, to } = result;

                    donePromises.push(to.writePackageJson().then(() => {
                        // tslint:disable-next-line: max-line-length
                        console.log(colors.blue.bold.$`- Package ${from.project.packageJson.json.name} installed in ${to.packageJson.json.name} package.json "localDependencies" (mode: ${from.localDependency.mode})`
                        );
                    }));
                }
            }

            return Promise.all(donePromises).then(() => { console.log('\n'); });
        } catch (err) {
            console.error(red`Something wrong happened: ${err.message || err}`, err.stack ? red`\n${err.stack}` : '');
        } finally {
            if (this.options.watch) {
                console.log('\n');
                return this.startWatch().then(() => { });
            }
        }
    }

    private async startWatch() {
        const watchPromise: Promise<void>[] = [];

        for (const [ npmProject, filesInstaller ] of this.filesInstallerByProject) {
            console.log(colors.green.bold.$`Start watching ${npmProject.packageJson.json.name}`);
            watchPromise.push(filesInstaller.startWatch());
        }

        console.log('\n');
        return Promise.all(watchPromise);
    }

    private async _installLocalDependencies(npmProjectDependencies: NpmProjectDependencies): Promise<Array<InstalledLocalDependency[]>> {
        const installDepsPromises: Promise<InstalledLocalDependency[]>[] = [];

        for (const [ project, dependencies ] of npmProjectDependencies.dependencies)
            installDepsPromises.push(this._installProjectLocalDependencies(project, dependencies));


        return Promise.all(installDepsPromises);
    }

    private async _installProjectLocalDependencies(project: NpmProject, dependencies: NpmProjectDependency[]): Promise<InstalledLocalDependency[]> {

        await project.loadProject();

        return Promise.all(dependencies.map(async dependency => {
            const depProject = dependency.project;

            await depProject.loadProject();

            const dep = await project.localDependencyInPackageJson(depProject.packageJson.json.name);
            const filesInInstallDir = await project.filesInInstallDir(this.options.installDir);

            const filesInstaller = new FilesInstaller({
                dependency: depProject,
                project,
                mode: dependency.localDependency.mode,
                verbose: this.options.verbose,
                installDir: dependency.localDependency.installDir
            });

            this.filesInstallerByProject.set(depProject, filesInstaller);
            let filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();

            if (dep && dep.version === depProject.packageJson.json.version && filesInInstallDir.includes(depProject.packageJson.json.name)) {

                for (const [ key, file ] of filesToBeInstalled) {
                    // install only what does not exist already
                    const fileDest = path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.original));
                    if (path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.original)) === fileDest)
                        filesToBeInstalled.delete(key);
                }

                if (filesToBeInstalled.size === 0) {
                    if (!this.options.force)
                        return { skipped: true, reason: `${depProject.packageJson.json.name} is already installed with the latest version ${dep.version}` };


                    // reinstall all
                    filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();
                    console.log(yellow`${depProject.packageJson.json.name} will be reinstalled by force\n`);
                }
            }


            await filesInstaller.copyFiles(filesToBeInstalled);

            if (this.options.verbose)
                filesInstaller.logInstalledFiles();

            // add localDependencies project in package.json
            await project.addLocalDependency(dependency);

            return { from: dependency, to: project };
        }));
    }

};
