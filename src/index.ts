#!/usr/bin/env node

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
import('../require-override').then(async ({ requireOverride }) => {
    const libraryFolder = '/home/milottit/Libraries';
    const localPackages = await lookForLocalPackages(libraryFolder);

    requireOverride.start({
        module: (requestPath: string) => requestPath.startsWith('@upradata'),
        newModule: (requestPath: string) => {
            const segments = requestPath.split('/');
            const packageName = segments.slice(0, 2).join('/'); // @upradata/name

            const foundPackage = localPackages.find(p => p.package.name === packageName);
            return foundPackage ? foundPackage.folder : undefined;
        }
    });


    const { LocalInstall } = await import('./local-install');
    const { processArgs } = await import('./yargs');
    const { green, yellow } = await import('./util/colors');

    new LocalInstall(processArgs()).install().then(() => {
        // console.log(green`\n\Local dependencies installed!`);
    }).catch(e => {
        console.warn(yellow`${typeof e === 'string' ? e : `${e.message}\n${e.stack}`}`);
    });

});
