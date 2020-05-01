
import { chain, isDefined } from '@upradata/util';
import path from 'path';
import { copy, Stats, remove, ensureSymlink } from 'fs-extra';
import { NpmProject } from './node-project';
import { stringAlignCenter, terminalWidth } from './util/common';
import { yellow, green, colors, fullWidthBg, blue } from './util/colors';
import { isUndefined } from 'util';
import { OriginalAbsolute, SourceDest, Skipped, isSkipped } from './types';
import { InstallMode } from './local-install.options';
import { lstat$ } from './util/promisify';
import watch, { ImprovedFSWatcher } from 'node-watch';




export class FilesInstalled {
    files = new Set<(SourceDest<OriginalAbsolute> | Skipped)>();

    constructor(public dest: NpmProject) { }

    removeFiles(...files: OriginalAbsolute[]) {
        for (const file of files) {
            const i = [ ...this.files.values() ].findIndex(f => !isSkipped(f) && f.source.absolute === file.absolute);
            if (i !== -1)
                [ ...this.files.values() ].splice(i, 1);
        }
    }
}

export type FilesToBeInstalled = Map<string, OriginalAbsolute>;


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
    public installedFiles: FilesInstalled;
    public filesToWatch: FilesToBeInstalled;
    private watcher: ImprovedFSWatcher;
    private pathType: keyof OriginalAbsolute;


    constructor(options: FilesInstallerOptions) {
        super(options);
        this.pathType = this.verbose > 1 ? 'absolute' : 'original';
        this.installedFiles = new FilesInstalled(this.project);
    }


    private add(filesToBeInstalled: FilesToBeInstalled, ...files: string[]) {
        for (const file of files) {
            if (isDefined(file)) {
                const absolute = file.startsWith('/') ? file : this.dependency.absolutePath(file);

                filesToBeInstalled.set(absolute, {
                    original: this.dependency.originalPath(path.basename(file)),
                    absolute
                });
            }
        }
    }

    private async stats(file: string): Promise<{ file: string, stats: Stats; }> {
        if (isDefined(file)) {
            const f = file.startsWith('/') ? file : this.dependency.absolutePath(file);

            return lstat$(f).then(stats => ({ file, stats })).catch(e => {
                // to create a stack that has not been created by the lstat call
                // return Promise.reject(new Error(e.message));
                console.warn(yellow`"${f}" does not exist`);
                return { file: undefined, stats: undefined };
            });
        }

        return { file: undefined, stats: undefined };
    }

    public async readFilesToBeInstalled() {
        const { main, module, files, types, typings } = await this.dependency.getPackageJson(true);

        const filesToBeInstalled: FilesToBeInstalled = new Map<string, OriginalAbsolute>();
        const add: (...files: string[]) => void = this.add.bind(this, filesToBeInstalled);

        add('package.json');
        add('node_modules');
        add(types);
        add(typings);

        // if exists then stats exists
        await this.stats('node_modules/.pnpm').then(({ stats }) => add('node_modules/.pnpm')).catch(() => { });


        if (chain(() => files.length, 0) > 0)
            add(...files);

        const mainFiles = [ main, module ].filter(file => !!file).map(file => this.stats(file));

        for await (const { file, stats } of await Promise.all(mainFiles)) {
            if (isDefined(file)) {
                if (stats.isDirectory())
                    add(file);
                else
                    add(path.dirname(file));
            }
        }

        return filesToBeInstalled;
    }

    public async copyFiles(filesToBeInstalled?: FilesToBeInstalled): Promise<FilesInstalled> {
        const filesToBeCopied = filesToBeInstalled || await this.readFilesToBeInstalled();
        const copiedFiles = new FilesInstalled(this.project);

        if (filesToBeCopied.size === 0) {
            const projectPath = this.verbose > 1 ? this.dependency.projectPath.absolute : this.dependency.projectPath.original;

            copiedFiles.files.add({
                skipped: true,
                reason: `no files to be installed in ${projectPath}`
            });

        } else {

            const dest = this.directoryToCopy;

            await remove(dest.absolute).catch(console.warn);

            const copyPromises: Promise<SourceDest<OriginalAbsolute> | Skipped>[] = [];

            for (const fileOrDir of filesToBeCopied.values()) {

                const destination = path.join(dest.absolute, path.basename(fileOrDir.original));

                const copyOrLink = this.copyOrLink(fileOrDir.absolute, destination);

                copyPromises.push(
                    copyOrLink.then(() => {
                        return { source: fileOrDir, dest };
                    }).catch(e => {
                        // create stack
                        const err = new Error(typeof e === 'string' ? e : e.message);

                        return {
                            skipped: true,
                            reason: `${err.message}\n${err.stack}`
                        };
                    })
                );
            }

            for await (const file of await Promise.all(copyPromises))
                copiedFiles.files.add(file);
        }

        for (const file of copiedFiles.files)
            this.installedFiles.files.add(file);

        return copiedFiles;
    }

    public get directoryToCopy() {
        return this.project.path(this.installDir, this.dependency.packageJson.json.name);

    }
    private copyOrLink(source: string, destination: string) {
        return this.mode === 'copy' ?
            copy(source, destination, { preserveTimestamps: true, overwrite: true }) :
            ensureSymlink(source, destination);
    }

    public async startWatch() {
        this.filesToWatch = await this.readFilesToBeInstalled();

        if (this.filesToWatch.size === 0)
            return;

        for (const fileOrDir of this.filesToWatch.values()) {

            const destination = this.installedFiles.dest.path(this.installDir, this.dependency.packageJson.json.name);
            this.watcher = watch(fileOrDir.absolute, { recursive: false }, async (event, name) => {
                const relativeFile = path.relative(this.dependency.projectPath.absolute, name);
                const filename = this.dependency.path(relativeFile)[ this.pathType ];

                console.log(green`${event}: file "${filename}"`);

                // check if package.json has new local dependencies
                if (path.basename(fileOrDir.original) === 'package.json') {
                    const { newFilesToBeInstalled, removedFiles } = await this.checkNewOrRemovedFilesToBeInstalled();

                    if (newFilesToBeInstalled) {
                        console.log(colors.green.bold.$`\nNews files detected in project: ${this.dependency.packageJson.json.name}\n`);

                        this.copyFiles(newFilesToBeInstalled).then(copiedFiles =>
                            this.logInstalledFiles({ title: false, indent: false }, copiedFiles)
                        );
                    }

                    if (removedFiles) {
                        this.removeFiles(...[ ...removedFiles ]);
                    }

                    return;
                }

                if (event === 'remove') {
                    // creates a loop
                    // this.removeFiles(this.localDepProject.path((relativeFile)));
                }
                else if (event === 'update') {
                    this.copyOrLink(name, destination.absolute).then(() => {
                        console.log(blue`"${filename}" ${this.mode === 'copy' ? 'copied' : 'linked'} in ${destination[ this.pathType ]}`);
                    });
                }
            });

        }

    }

    private async removeFiles(...absoluteFiles: OriginalAbsolute[]) {
        const removedFiles = await Promise.all(absoluteFiles.map(async file => { await remove(file.absolute); return file; }));
        const destination = this.installedFiles.dest.path(this.installDir, this.dependency.packageJson.json.name);

        this.installedFiles.removeFiles(...removedFiles);

        for (const file of removedFiles)
            console.log(blue`"${file[ this.pathType ]}" has been deleted from ${destination[ this.pathType ]}`);
    }


    private async checkNewOrRemovedFilesToBeInstalled() {
        const filesToBeInstalled = await this.readFilesToBeInstalled();
        const newFilesToBeInstalled: FilesToBeInstalled = new Map();
        const removedFiles = new Set<OriginalAbsolute>();
        const destination = this.installedFiles.dest.path(this.installDir, this.dependency.packageJson.json.name);

        for (const toBeInstalled of filesToBeInstalled.values()) {

            const dep = [ ...this.filesToWatch.values() ].find(file => {
                if (file.absolute === toBeInstalled.absolute)
                    return true;
            });

            if (!dep) {
                // a new local dependency has to be installed
                this.add(newFilesToBeInstalled, toBeInstalled.absolute);
            }
        }

        for (const file of this.filesToWatch.values()) {
            const foundDep = [ ...filesToBeInstalled.values() ].find(toBeInstalled => {
                if (file.absolute === toBeInstalled.absolute)
                    return true;
            });

            if (!foundDep) {
                // a new local dependency has to be deleted
                removedFiles.add({
                    original: path.join(destination.original, path.basename(file.original)),
                    absolute: path.join(destination.absolute, path.basename(file.original))
                });
            }
        }

        return {
            newFilesToBeInstalled: newFilesToBeInstalled.size === 0 ? undefined : newFilesToBeInstalled,
            removedFiles: removedFiles.size === 0 ? undefined : removedFiles
        };
    }

    public stopWatch() {
        this.watcher.close();
    }

    public logInstalledFiles(options?: Partial<LogOptions>, installedFiles?: FilesInstalled) {
        const o = Object.assign(new LogOptions(), options);

        const filesInstalled = installedFiles || this.installedFiles;

        if (isUndefined(filesInstalled))
            return;

        const source = this.dependency;
        const dest = filesInstalled.dest;

        if (o.title) {
            const localInstalled = stringAlignCenter(
                // tslint:disable-next-line: max-line-length
                `${this.dependency.packageJson.json.name} ("${source.projectPath[ this.pathType ]}") installed in ${dest.packageJson.json.name} ("${dest.projectPath[ this.pathType ]}")`, terminalWidth
            );

            const write = (...values: any[]) => values.forEach(v => process.stdout.write(v));
            write(
                fullWidthBg(colors.bgGreen.$), '\n\n',
                colors.white.bold.$`${localInstalled}`, '\n\n',
                fullWidthBg(colors.bgGreen.$),
                '\n\n'
            );
        }

        const indent = o.indent ? '    - ' : '';

        for (const file of filesInstalled.files) {
            if (isSkipped(file))
                console.log(yellow`${indent}Could not install package ${source.projectPath[ this.pathType ]}:\n "${file.reason}"`);
            else
                console.log(green`${indent}"${file.source[ this.pathType ]}" installed in "${file.dest[ this.pathType ]}"`);
        }

        console.log('\n');
    }
}
