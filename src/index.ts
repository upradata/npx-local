#!/usr/bin/env node

import path from 'path';
import type { SettingsPrivate } from './settings.private';


if (process.env.NODE_ENV === 'production') {

    import('./yargs').then(({ runCommand }) => runCommand());

} else {

    const main = async () => {

        // To be independent from self package
        const settings: SettingsPrivate = await import('../settings.private.json');
        const { libraryFolder } = settings.upradata;

        const { RequireOverride } = await import(path.join(libraryFolder, 'require-override'));
        const { lookForLocalPackages } = await import('./local-packages');

        const localPackages = await lookForLocalPackages(libraryFolder);

        new RequireOverride().start({
            module: (requestPath: string) => requestPath.startsWith('@upradata'),
            newModule: (requestPath: string) => {
                const segments = requestPath.split('/');
                const packageName = segments.slice(0, 2).join('/'); // @upradata/name

                const foundPackage = localPackages.find(p => p.package.name === packageName);
                return foundPackage ? foundPackage.folder : undefined;
            }
        });

        const { runCommand } = await import('./yargs');

        runCommand();
    };

    main();

    /* (async function f() {
        const libraryFolder = '/home/milottit/Libraries';
        logger.log((await lookForLocalPackages(libraryFolder, {
            excludeFolder: [ '.git', '.vscode', 'node_modules', ],
            filterPackage: project => project.package.name.startsWith('@upradata/')
        })).map(p => p.folder));
        process.exit(1);
    })(); */
}
