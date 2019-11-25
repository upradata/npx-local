
import { red, colors, yellow } from './util/colors';
import { NpmProject } from './node-project';
import { FilesInstaller } from './files-installer';
import { SourceDest, Skipped, isSkipped } from './types';
import { LocalInstallOptions, LocalPackage } from './local-install.options';
import path from 'path';
import { LocalDependency } from './local-dependency';

export class LocalInstall {
    public options: LocalInstallOptions<LocalPackage>;
    private filesInstallerByProject = new Map<NpmProject, FilesInstaller>();


    constructor(options: LocalInstallOptions<LocalPackage>) {
        this.options = Object.assign(new LocalInstallOptions(), options);
    }

    public install() {
        if (this.options.localPackages.length > 0)
            return this.installLocalDepedenciesFromArgv();

        return this.installLocalDependenciesFromPackageJson(new NpmProject(process.cwd()));
    }

    public async installLocalDependenciesFromPackageJson(npmProject: NpmProject): Promise<void> {
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
            new LocalDependency(l.mode ? `${l.mode}:${l.path}` : l.path))
        );
    }

    public installLocalDependencies(dependencies: LocalDependency[]): Promise<void> {
        if (!dependencies || dependencies.length === 0)
            return Promise.resolve();

        const installPromises: Promise<SourceDest<NpmProject> | Skipped>[] = [];
        const dest = new NpmProject(this.options.projectDir);

        for (const dep of dependencies) {
            const depNpmProject = new NpmProject(dep.sourcePath, dep.mode || this.options.mode);

            if (depNpmProject.isLocalPackage())
                installPromises.push(this._installLocalDep(depNpmProject, dest));
            else
                console.warn(`Skip not local package ${dep}`);

        }


        return Promise.all(installPromises).then(async ret => {
            await dest.writePackageJson();
            return ret;
        }).then(ret => {
            const donePromises: Promise<void>[] = [];

            for (const result of ret) {
                if (isSkipped(result)) {
                    const { reason } = result;
                    console.log(yellow`    - ${reason}`);
                } else {
                    const { source, dest } = result;

                    donePromises.push(source.writePackageJson().then(() => {
                        // tslint:disable-next-line: max-line-length
                        console.log(colors.blue.bold.$`- Package ${source.packageJson.json.name} installed in ${dest.packageJson.json.name} package.json "localDependencies" (mode: ${source.mode || this.options.mode})`
                        );
                    }));
                }
            }

            return Promise.all(donePromises).then(() => { console.log('\n'); });
        }).catch(err => {
            console.error(red`Something wrong happened: ${err.message || err}`, err.stack ? red`\n${err.stack}` : '');
        }).then(() => {
            if (this.options.watch) {
                console.log('\n');
                return this.startWatch().then(() => { });
            }
        });
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

    private async _installLocalDep(source: NpmProject, dest: NpmProject): Promise<SourceDest<NpmProject> | Skipped> {
        await Promise.all([
            source.loadProject(),
            dest.loadProject()
        ]);

        const dep = await dest.localDependencyInPackageJson(source.packageJson.json.name);
        const filesInInstallDir = await dest.filesInInstallDir(this.options.installDir);

        const filesInstaller = new FilesInstaller({
            localDepProject: source,
            destNpmProject: dest,
            mode: source.mode || this.options.mode,
            verbose: this.options.verbose,
            installDir: this.options.installDir
        });

        this.filesInstallerByProject.set(source, filesInstaller);
        let filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();

        if (dep && dep.version === source.packageJson.json.version && filesInInstallDir.includes(source.packageJson.json.name)) {

            for (const [ key, file ] of filesToBeInstalled) {
                // install only what does not exist already
                const fileDest = path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.original));
                if (path.join(filesInstaller.directoryToCopy.absolute, path.basename(file.original)) === fileDest)
                    filesToBeInstalled.delete(key);
            }

            if (filesToBeInstalled.size === 0) {
                if (!this.options.force)
                    return { skipped: true, reason: `${source.packageJson.json.name} is already installed with the latest version ${dep.version}` };


                // reinstall all
                filesToBeInstalled = await filesInstaller.readFilesToBeInstalled();
                console.log(yellow`${source.packageJson.json.name} will be reinstalled by force\n`);
            }
        }


        await filesInstaller.copyFiles(filesToBeInstalled);

        if (this.options.verbose)
            filesInstaller.logInstalledFiles();

        // add localDependencies project in package.json
        await dest.addLocalDependency({ dependency: source, installDir: this.options.installDir });

        return { source, dest };
    }

}
