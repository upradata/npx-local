#!/usr/bin/env node

import path from 'path';
import { lookForLocalPackages } from './local-packages';


/* (async function f() {
    const libraryFolder = '/home/milottit/Libraries';
    console.log((await lookForLocalPackages(libraryFolder, {
        excludeFolder: [ '.git', '.vscode', 'node_modules', ],
        filterPackage: project => project.package.name.startsWith('@upradata/')
    })).map(p => p.folder));
    process.exit(1);
})(); */


// To be independent from self package
const libraryFolder = '/home/milottit/Libraries/Upra-Data';


import(path.join(libraryFolder, 'Util/require-override')).then(async ({ RequireOverride }) => {
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

    const { runCommand: processArgs } = await import('./yargs');

    processArgs();
});
