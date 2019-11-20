
import { chain, isDefined } from '@upradata/util';
import path from 'path';
import { copy, Stats } from 'fs-extra';
import { NpmProject } from './node-project';
import { lstat$, stringAlignCenter, terminalWidth } from './util/common';
import { yellow, green, colors, fullWidthBg } from './util/colors';
import { isUndefined } from 'util';
import { OriginalAbsolute, SourceDest, Skipped, isSkipped } from './types';




export interface CopiedFiles {
    dest: NpmProject;
    files: (SourceDest<OriginalAbsolute> | Skipped)[];
}

export class FilesInstaller {

    public filesToBeInstalled: OriginalAbsolute[] = [];
    public installedFiles: CopiedFiles;


    constructor(public npmProject: NpmProject) { }


    private add(...files: string[]) {
        for (const file of files) {
            if (isDefined(file)) {
                const f = file.startsWith('/') ? file : this.npmProject.absolutePath(file);
                this.filesToBeInstalled.push({
                    original: path.join(this.npmProject.projectPath.original, file),
                    absolute: f
                });
            }
        }
    }


    private async stats(file: string): Promise<{ file: string, stats: Stats; }> {
        if (isDefined(file)) {
            const f = file.startsWith('/') ? file : this.npmProject.absolutePath(file);

            return lstat$(f).then(stats => ({ file, stats })).catch(e => {
                // to create a stack that has not been created by the lstat call
                return Promise.reject(new Error(e.message));
            });
        }

        return { file: undefined, stats: undefined };
    }

    public async readFilesToBeInstalled() {
        const { main, module, files, types, typings } = await this.npmProject.getPackageJson();

        this.add('package.json');
        this.add(types);
        this.add(typings);


        if (chain(() => files.length, 0) > 0)
            this.add(...files.map(file => this.npmProject.absolutePath(file)));
        else {
            const files = [ main, module ].filter(file => !!file).map(file => this.stats(file));

            for await (const { file, stats } of await Promise.all(files)) {
                if (isDefined(file)) {
                    if (stats.isDirectory())
                        this.add(file);
                    else
                        this.add(path.basename(file));
                }
            }
        }
    }

    public async copyFiles(destNpmProject: NpmProject): Promise<CopiedFiles> {
        await this.readFilesToBeInstalled();

        if (this.filesToBeInstalled.length === 0) {
            this.installedFiles = {
                dest: destNpmProject,
                files: [
                    {
                        skipped: true,
                        reason: `no files to be installed in ${this.npmProject.projectPath.absolute}`
                    }
                ]
            };

        } else {

            const nodeModulePackage = path.join('node_modules', this.npmProject.packageJson.name);

            const dest: OriginalAbsolute = {
                absolute: path.join(destNpmProject.projectPath.absolute, nodeModulePackage),
                original: path.join(destNpmProject.projectPath.original, nodeModulePackage)
            };


            const copyPromises: Promise<SourceDest<OriginalAbsolute> | Skipped>[] = [];

            for (const fileOrDir of this.filesToBeInstalled) {

                const destination = path.join(dest.absolute, path.basename(fileOrDir.absolute));

                copyPromises.push(
                    copy(fileOrDir.absolute, destination, { preserveTimestamps: true, overwrite: true }).then(() => {
                        return { source: fileOrDir, dest };
                    }).catch(e => {
                        return {
                            skipped: true,
                            reason: typeof e === 'string' ? e : `${e.message}\n${e.stack}`
                        };
                    })
                );
            }

            this.installedFiles = { dest: destNpmProject, files: await Promise.all(copyPromises) };

        }
        return this.installedFiles;
    }

    logInstalledFiles() {
        if (isUndefined(this.installedFiles))
            return;

        const source = this.npmProject;
        const dest = this.installedFiles.dest;

        const localInstalled = stringAlignCenter(
            `${this.npmProject.packageJson.name} ("${source.projectPath.original}") installed in ${dest.packageJson.name} ("${dest.projectPath.original}")`, terminalWidth
        );

        console.log(
            fullWidthBg(colors.bgGreen.$), '\n\n',
            colors.white.bold.$`${localInstalled}`, '\n',
            fullWidthBg(colors.bgGreen.$),
            '\n'
        );

        for (const file of this.installedFiles.files) {
            if (isSkipped(file))
                console.log(yellow`    - Could not install package ${source.projectPath.absolute}:\n "${file.reason}"`);
            else
                console.log(green`    - "${file.source.original}" installed in "${file.dest.original}"`);
        }

        console.log('\n');
    }
}
