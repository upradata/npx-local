import { join } from 'path';
import { readdir, stat } from 'fs-extra';


export const lookForLocalPackages = async (libraryFolder: string, maxDepth: number = NaN) => {

    const findProjects = (folders: string[]) => {
        return Promise.all(folders.map(async folder => {
            const files = await readdir(folder);
            const packageJson = files.find(file => file === 'package.json');

            return packageJson ? { folder, name: require(join(folder, packageJson)).name } : { folder, name: undefined };
        }));
    };

    let depth: number = 0;

    const getProjectNames = (folders$: Promise<{ folder: string, name: string; }[]>): Promise<{ folder: string, name: string; }[]> => {
        return folders$.then(async projects => {
            const foundProjects = projects.filter(p => p.name);

            ++depth;
            if (depth > maxDepth)
                return foundProjects;

            const restFolders = await Promise.all(projects
                .filter(p => !p.name) // all files without a project name found (i.e. not a folder with package.json)
                .map(async ({ folder }) => ({ folder, files: await readdir(folder) }))
            );

            const folders = await Promise.all(restFolders
                .flatMap(({ folder, files }) => files
                    .map(file => join(folder, file))
                    .map(async file => ({ stats: await stat(file), file }))) // we keep only the directories in each folder
            ).then(folders => folders.filter(({ stats }) => stats.isDirectory()).map(({ file }) => file));


            if (folders.length === 0)
                return foundProjects;

            return foundProjects.concat(await getProjectNames(findProjects(folders)));
        });
    };

    return getProjectNames(Promise.resolve([ { folder: libraryFolder, name: undefined } ]));
};
