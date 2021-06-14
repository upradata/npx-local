
import { copy, ensureSymlink, lstat, remove, Stats } from 'fs-extra';
import path from 'path';
import { fileExists, green, oneLine, styles, terminal, yellow } from '@upradata/node-util';
import { isDefined, isUndefined } from '@upradata/util';
import { InstallMode } from './local-install.options';
import { NpmProject } from './node-project';
import { isSkipped, RelativeAbsolute, Skipped, SourceDest } from './types';


export class InstalledFiles {
    files = new Set<(SourceDest<RelativeAbsolute> | Skipped)>();

    constructor(public dest: NpmProject) { }

    removeFiles(...files: RelativeAbsolute[]) {
        for (const file of files) {
            const i = [ ...this.files.values() ].findIndex(f => !isSkipped(f) && f.source.absolute === file.absolute);

            if (i !== -1)
                [ ...this.files.values() ].splice(i, 1);
        }
    }
}

export type FilesToBeInstalled = Map<string, RelativeAbsolute>;


export class LogOptions {
    title: boolean = true;
    indent: boolean = true;
}


export class FilesInstallerOptions {
    project: NpmProject;
    dependency: NpmProject;
    installDir: string;
    mode: InstallMode = 'link';
    verbose?: number = 0;

    constructor(options: FilesInstallerOptions) {
        Object.assign(this, options);
    }
}


export class FilesInstaller extends FilesInstallerOptions {
    public options: FilesInstallerOptions;
    public installedFiles: InstalledFiles;
    public pathType: keyof RelativeAbsolute;


    constructor(options: FilesInstallerOptions) {
        super(options);
        this.pathType = this.verbose > 1 ? 'absolute' : 'relative';
        this.installedFiles = new InstalledFiles(this.project);
    }


    public async addFilesToBeInstalled(filesToBeInstalled: FilesToBeInstalled, ...files: string[]) {
        await Promise.all(files.map(async file => {
            if (isDefined(file) && await fileExists.async(file)) {

                const absolute = this.dependency.absolutePath(file);

                filesToBeInstalled.set(absolute, {
                    relative: this.dependency.relativePath(path.basename(file)),
                    absolute
                });
            }
        }));
    }

    private async stats(file: string, options: { verbose?: boolean; } = {}): Promise<{ file: string; stats: Stats; }> {
        const absolute = this.dependency.absolutePath(file);

        if (isDefined(file) && await fileExists.async(absolute)) {
            return lstat(absolute).then(stats => ({ file, stats }));
        }

        if (options.verbose)
            console.warn(yellow`"${absolute}" does not exist`);

        return { file: undefined, stats: undefined };
    }

    public async readFilesToBeInstalled(): Promise<FilesToBeInstalled> {
        const { main, module, files = [], types, typings } = await this.dependency.getPackageJson(true);

        const filesToBeInstalled: FilesToBeInstalled = new Map<string, RelativeAbsolute>();
        const add = (...files: string[]) => {
            files.filter(v => !!v).map(file => this.addFilesToBeInstalled(filesToBeInstalled, this.dependency.absolutePath(file)));
        };

        await Promise.all([
            add('package.json'),
            add('node_modules'),
            add('node_modules/.pnpm'),
            add(types),
            add(typings),
            add(...files)
        ]);

        const mainFiles = [ main, module ].filter(v => !!v).map(file => this.stats(file, { verbose: true }));

        for await (const { file, stats } of mainFiles) {
            if (isDefined(file)) {
                if (stats.isDirectory())
                    add(file);
                else
                    add(path.dirname(file));
            }
        }

        return filesToBeInstalled;
    }

    public async copyFiles(filesToBeInstalled?: FilesToBeInstalled): Promise<InstalledFiles> {
        const filesToBeCopied = filesToBeInstalled || await this.readFilesToBeInstalled();
        const copiedFiles = new InstalledFiles(this.project);

        if (filesToBeCopied.size === 0) {
            const projectPath = this.verbose > 1 ? this.dependency.projectPath.absolute : this.dependency.projectPath.relative;

            copiedFiles.files.add({
                skipped: true,
                reason: `no files to be installed in ${projectPath}`
            });

        } else {

            const dest = this.directoryToCopy;

            await remove(dest.absolute).catch(console.warn);

            const copyPromises = [ ...filesToBeCopied.values() ].map(async fileOrDir => {
                const destination = path.join(dest.absolute, path.basename(fileOrDir.relative));

                try {
                    await this.copyOrLink(fileOrDir.absolute, destination);
                    return { source: fileOrDir, dest };

                } catch (e) {
                    // create stack
                    const err = new Error(typeof e === 'string' ? e : e.message);

                    return {
                        skipped: true,
                        reason: `${err.message}\n${err.stack}`
                    };
                }
            });


            for await (const file of copyPromises)
                copiedFiles.files.add(file);
        }

        for (const file of copiedFiles.files)
            this.installedFiles.files.add(file);

        return copiedFiles;
    }


    public get directoryToCopy() {
        return this.project.path(this.installDir, this.dependency.packageJson.json.name);

    }


    public copyOrLink(source: string, destination: string) {
        return this.mode === 'copy' ?
            copy(source, destination, { preserveTimestamps: true, overwrite: true }) :
            ensureSymlink(source, destination);
    }


    public logInstalledFiles(options?: Partial<LogOptions>, installedFiles?: InstalledFiles) {
        const o = Object.assign(new LogOptions(), options);

        const filesInstalled = installedFiles || this.installedFiles;

        if (isUndefined(filesInstalled))
            return;

        const source = this.dependency;
        const { dest } = filesInstalled;

        if (o.title) {

            const localInstalled = oneLine`
                    "${this.dependency.packageJson.json.name}" (${source.projectPath[ this.pathType ]}) installed in
                    "${dest.packageJson.json.name}" (${dest.projectPath[ this.pathType ]})
                `;

            const title = terminal.title(localInstalled, {
                style: styles.white.bold.$,
                bgStyle: styles.bgMagenta.$,
                type: 'two-strips'
            });

            console.log(`\n${title}\n`);
        }

        const indent = o.indent ? '    - ' : '';

        for (const file of filesInstalled.files) {
            if (isSkipped(file))
                console.log(yellow`${indent}Could not install package ${source.projectPath[ this.pathType ]}:\n "${file.reason}"`);
            else
                console.log(green`${indent}"${file.source[ this.pathType ]}" installed in "${file.dest[ this.pathType ]}"`);
        }
    }
}
