
import { red, colors, yellow } from './util/colors';
import { NpmProject } from './node-project';
import { FilesInstaller } from './files-installer';
import { SourceDest, Skipped, isSkipped } from './types';
import { ObjectOf } from '@upradata/util';
import { LocalInstallOptions } from './local-install.options';
import path from 'path';

export class LocalInstall {
    public options: LocalInstallOptions;
    private filesInstallerByProject = new Map<NpmProject, FilesInstaller>();


    constructor(options: LocalInstallOptions) {
        this.options = Object.assign(new LocalInstallOptions(), options);
    }

    public install() {
        if (this.options.localPackages.length > 0)
            return this.installLocalDepedenciesFromArgv();

        return this.installLocalDependenciesFromPackageJson(new NpmProject(process.cwd()));
    }

    public async installLocalDependenciesFromPackageJson(npmProject: NpmProject): Promise<void> {
        const packageJson = await npmProject.loadProject();
        const localDeps: ObjectOf<string> = packageJson.local.dependencies;

        if (!localDeps)
            return console.log(yellow`No localDependencies found in ${npmProject.packageJson.json.name} package.json`);


        const deps = Object.values(localDeps).map(dep => dep.split('@')[ 0 ]).map(depPath => path.relative(process.cwd(), depPath));
        return this.installLocalDependencies(deps);
    }

    public installLocalDepedenciesFromArgv(): Promise<void> {
        return this.installLocalDependencies(this.options.localPackages);
    }

    public installLocalDependencies(dependencies: string[]): Promise<void> {
        if (!dependencies || dependencies.length === 0)
            return Promise.resolve();

        const installPromises: Promise<SourceDest<NpmProject> | Skipped>[] = [];
        const dest = new NpmProject(this.options.installDir);

        for (const pkg of dependencies) {

            const isLocal = /^(\.|\/)/.test(pkg);
            if (isLocal)
                installPromises.push(this._installLocalDep(new NpmProject(pkg), dest));
            else
                console.warn(`Skip not local package ${pkg}`);

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
                        console.log(colors.blue.bold.$`\n
                        - Package ${source.packageJson.json.name} installed in ${dest.packageJson.json.name} package.json "localDependencies"`
                        );
                    }));
                }
            }

            return Promise.all(donePromises).then(() => { });
        }).catch(err => {
            console.error(red`Something wrong happened: ${err.message || err}`, err.stack ? red`\n${err.stack}` : '');
        }).then(() => {
            if (this.options.watch) {
                console.log('\n');
                this.startWatch();
            }
        });
    }

    private async startWatch() {
        for (const [ npmProject, filesInstaller ] of this.filesInstallerByProject) {
            console.log(colors.green.bold.$`Start watching ${npmProject.packageJson.json.name}`);
            filesInstaller.startWatch();
        }

        console.log('\n');
    }

    private async _installLocalDep(source: NpmProject, dest: NpmProject): Promise<SourceDest<NpmProject> | Skipped> {
        await Promise.all([
            source.loadProject(),
            dest.loadProject()
        ]);

        const dep = await dest.localDependency(source.packageJson.json.name);
        const destNodeModulesFiles = await dest.nodeModulesFiles();

        if (dep && dep.version === source.packageJson.json.version && destNodeModulesFiles.includes(source.packageJson.json.name)) {
            if (!this.options.force)
                return { skipped: true, reason: `${source.packageJson.json.name} is already installed with the latest version ${dep.version}` };

            console.log(yellow`${source.packageJson.json.name} will be reinstalled by force\n`);
        }

        const filesInstaller = new FilesInstaller({ localDepProject: source, destNpmProject: dest, mode: this.options.mode, verbose: this.options.verbose });
        this.filesInstallerByProject.set(source, filesInstaller);

        await filesInstaller.copyFiles();

        if (this.options.verbose)
            filesInstaller.logInstalledFiles();

        // add localDependencies project in package.json
        await dest.addLocalDependency(source);

        return { source, dest };
    }

}
