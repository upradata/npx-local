import { dirname, join } from 'path';
import { forEachFiles, ForEachFilesOptions } from '@upradata/node-util';


import type { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
interface Project {
    folder: string;
    package: JSONSchemaForNPMPackageJsonFiles;
}



export const lookForLocalPackages = async (libraryFolder: string, options?: ForEachFilesOptions): Promise<Project[]> => {

    const foundProjects = [] as Project[];

    await forEachFiles(libraryFolder, { recursive: true, ...options }, async (path, dirent) => {
        const packageJsonFile = 'package.json';
        const isPackageJson = dirent.isFile() && dirent.name === packageJsonFile;

        if (isPackageJson) {
            const folder = dirname(path);

            foundProjects.push({
                folder,
                package: await import(join(folder, packageJsonFile))
            });
        }
    });

    return foundProjects;
};
