import { dirname, join } from 'path';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { forEachFiles, ForEachFilesOptions } from '@upradata/node-util';


interface Project {
    folder: string;
    package: JSONSchemaForNPMPackageJsonFiles;
}

export interface Options {
    maxDepth?: number;
    excludeFolder?: string[] | ((folder: string) => boolean);
    filterPackage?: (project: Project) => boolean;
}

export const lookForLocalPackages = async (libraryFolder: string, options?: ForEachFilesOptions): Promise<Project[]> => {
    /*  const { maxDepth = NaN, excludeFolder: exclude = () => false, filterPackage = () => true } = options;

     const excludeFolder = typeof exclude === 'function' ? exclude : (folder: string) => exclude.some(e => e === basename(folder));

     const findProjects = (folders: string[]): Promise<Project[]> => {
         return Promise.all(folders.map(async folder => {
             const files = await readdir(folder);
             const packageJson = files.find(file => file === 'package.json');

             return packageJson ? { folder, package: require(join(folder, packageJson)) } : { folder, package: undefined };
         }));
     };

     let depth: number = 0;

     const getProjects = async (projects$: Promise<Project[]>): Promise<Project[]> => {
         const projects = await projects$;

         const foundProjects = projects.filter(p => p.package).filter(filterPackage);

         ++depth;
         if (depth > maxDepth)
             return foundProjects;

         const restFolders = await Promise.all(projects
             .filter(p => !p.package) // all files without a package.json
             .filter(p => !excludeFolder(p.folder))
             .map(async ({ folder }) => ({ folder, files: await readdir(folder) }))
         );

         const folders = await Promise.all(restFolders
             .flatMap(({ folder, files }) => files
                 .map(file => join(folder, file))
                 .map(async file => ({ stats: await stat(file), file }))) // we keep only the directories in each folder
         ).then(files => files.filter(({ stats }) => stats.isDirectory()).map(({ file }) => file));


         if (folders.length === 0)
             return foundProjects;

         return foundProjects.concat(await getProjects(findProjects(folders)));
     };

     return getProjects(findProjects([ libraryFolder ]));
    */

    const foundProjects = [] as Project[];

    forEachFiles(libraryFolder, { recursive: true, ...options }, (path, dirent) => {
        const packageJsonFile = 'package.json';
        const isPackageJson = dirent.isFile() && dirent.name === packageJsonFile;

        if (isPackageJson) {
            const folder = dirname(path);

            foundProjects.push({
                folder,
                package: require(join(folder, packageJsonFile))
            });
        }
    });

    return foundProjects;
};
