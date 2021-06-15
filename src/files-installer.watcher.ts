import path from 'path';
import fs from 'fs-extra';
import watch, { ImprovedFSWatcher } from 'node-watch';
import { styles, green, blue } from '@upradata/node-util';
import { Component, InjectProp } from '@upradata/dependency-injection';
import { RelativeAbsolute } from './types';
import { FilesInstaller, FilesToBeInstalled } from './files-installer';
import { Logger } from './logger';



@Component()
export class FilesInstallerWatcher {
    @InjectProp(Logger) private logger: Logger;
    private watcher: ImprovedFSWatcher;
    private filesToWatch: FilesToBeInstalled;


    constructor(public filesInstaller: FilesInstaller) { }


    public async startWatch() {
        const { installedFiles, installDir, dependency, pathType, mode } = this.filesInstaller;

        if (this.filesToWatch.size === 0)
            return;

        for (const fileOrDir of this.filesToWatch.values()) {

            const destination = installedFiles.dest.path(installDir, dependency.packageJson.json.name);

            this.watcher = watch(fileOrDir.absolute, { recursive: false }, async (event, name) => {
                const relativeFile = path.relative(dependency.projectPath.absolute, name);
                const filename = dependency.path(relativeFile)[ pathType ];

                this.logger.log(green`${event}: file "${filename}"`);

                // check if package.json has new local dependencies
                if (path.basename(fileOrDir.relative) === 'package.json') {
                    const { newFilesToBeInstalled, removedFiles } = await this.checkNewOrRemovedFilesToBeInstalled();

                    if (newFilesToBeInstalled) {
                        this.logger.log(styles.green.bold.$`\nNews files detected in project: ${dependency.packageJson.json.name}\n`);

                        const copiedFiles = await this.filesInstaller.copyFiles(newFilesToBeInstalled);
                        this.filesInstaller.logInstalledFiles({ title: false, indent: false }, copiedFiles);
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
                    this.filesInstaller.copyOrLink(name, destination.absolute).then(() => {
                        this.logger.log(blue`"${filename}" ${mode === 'copy' ? 'copied' : 'linked'} in ${destination[ pathType ]}`);
                    });
                }
            });

        }

    }

    private async removeFiles(...absoluteFiles: RelativeAbsolute[]) {
        const { installedFiles, dependency, installDir, pathType } = this.filesInstaller;

        const removedFiles = await Promise.all(absoluteFiles.map(async file => { await fs.remove(file.absolute); return file; }));
        const destination = installedFiles.dest.path(installDir, dependency.packageJson.json.name);

        installedFiles.removeFiles(...removedFiles);

        for (const file of removedFiles)
            this.logger.log(blue`"${file[ pathType ]}" has been deleted from ${destination[ pathType ]}`);
    }


    private async checkNewOrRemovedFilesToBeInstalled() {
        const { installedFiles, dependency, installDir } = this.filesInstaller;


        const filesToBeInstalled = await this.filesInstaller.readFilesToBeInstalled();
        const newFilesToBeInstalled: FilesToBeInstalled = new Map();
        const removedFiles = new Set<RelativeAbsolute>();
        const destination = installedFiles.dest.path(installDir, dependency.packageJson.json.name);

        for (const toBeInstalled of filesToBeInstalled.values()) {

            const dep = [ ...this.filesToWatch.values() ].find(file => file.absolute === toBeInstalled.absolute);

            if (!dep) {
                // a new local dependency has to be installed
                this.filesInstaller.addFilesToBeInstalled(newFilesToBeInstalled, toBeInstalled.absolute);
            }
        }

        for (const file of this.filesToWatch.values()) {
            const foundDep = [ ...filesToBeInstalled.values() ].find(toBeInstalled => file.absolute === toBeInstalled.absolute);

            if (!foundDep) {
                // a new local dependency has to be deleted
                removedFiles.add({
                    relative: path.join(destination.relative, path.basename(file.relative)),
                    absolute: path.join(destination.absolute, path.basename(file.relative))
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
}
