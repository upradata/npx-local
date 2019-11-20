
import { red, colors, yellow } from './util/colors';
import { NpmProject } from './node-project';
import { FilesInstaller } from './files-installer';
import { SourceDest, Skipped, isSkipped } from './types';
import { ObjectOf } from '@upradata/util';

export class LocalInstallOptions {
    localPackages?: string[];
    installDir?: string = process.cwd();
    verbose: boolean = false;
    force: boolean = false;
}

export class LocalInstall {
    public options: LocalInstallOptions;

    constructor(options: LocalInstallOptions) {
        this.options = Object.assign(new LocalInstallOptions(), options);
    }

    public install() {
        if (this.options.localPackages)
            return this.installLocalDepedenciesFromArgv();

        return this.installLocalDependenciesFromPackageJson(new NpmProject(process.cwd()));
    }

    public async installLocalDependenciesFromPackageJson(npmProject: NpmProject): Promise<void> {
        const packageJson = await npmProject.loadProject();
        const localDeps: ObjectOf<string> = packageJson[ NpmProject.localDependenciesFieldName ];

        if (!localDeps)
            return console.log(yellow`No localDependencies found in ${npmProject.packageJson.name} package.json`);

        return this.installLocalDependencies(Object.values(localDeps).map(dep => dep.split('@')[ 0 ]));
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

            for (const result of ret) {
                if (isSkipped(result)) {
                    const { reason } = result;
                    console.log(yellow`    - ${reason}`);
                } else {
                    const { source, dest } = result;
                    console.log(colors.blue.bold.$`\n\n
                        - Package ${source.packageJson.name} installed in ${dest.packageJson.name} package.json "localDependencies"`
                    );
                }
            }
        }).catch(err => {
            console.error(red`Something wrong happened: ${err.message || err}`, err.stack ? red`\n${err.stack}` : '');
        });
    }


    // tslint:disable-next-line: function-name
    private async _installLocalDep(source: NpmProject, dest: NpmProject): Promise<SourceDest<NpmProject> | Skipped> {
        await Promise.all([
            source.loadProject(),
            dest.loadProject()
        ]);

        const dep = await dest.localDependency(source.packageJson.name);
        const destNodeModulesFiles = await dest.nodeModulesFiles();

        if (dep && dep.version === source.packageJson.version && destNodeModulesFiles.includes(source.packageJson.name)) {
            if (!this.options.force)
                return { skipped: true, reason: `${source.packageJson.name} is already installed with the latest version ${dep.version}` };

            console.log(yellow`${source.packageJson.name} will be reinstalled by force\n`);
        }

        const filesInstaller = new FilesInstaller(source);
        await filesInstaller.copyFiles(dest);

        if (this.options.verbose)
            filesInstaller.logInstalledFiles();

        // add localDependencies project in package.json
        await dest.addLocalDependency(source);

        return { source, dest };
    }

}
