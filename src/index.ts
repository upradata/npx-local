#!/usr/bin/env node


/* (async function f() {
    const libraryFolder = '/home/milottit/Libraries';
    console.log(await lookForLocalPackages(libraryFolder));
    process.exit(1);
})(); */

import { lookForLocalPackages } from './local-packages';

// To be independent from self package
import('./require').then(async ({ requireOverride }) => {
    const libraryFolder = '/home/milottit/Libraries';
    const localPackages = await lookForLocalPackages(libraryFolder);

    /*  const folders = {
         util: '/home/milottit/Libraries/Util',
         graceful: '/home/milottit/Libraries/GracefulWatcher'
     }; */

    requireOverride.start({
        module: (requestPath: string) => requestPath.startsWith('@upradata'),
        // exports: 'caca'
        newModule: (requestPath: string) => {
            const segments = requestPath.split('/');
            const packageName = segments.slice(0, 2).join('/'); // @upradata/name

            const foundPackage = localPackages.find(({ folder, name }) => name === packageName);
            return foundPackage ? foundPackage.folder : undefined;
            /* const path = requestPath.replace('@upradata', '');
            console.log(requestPath);
            return [
                join(folders.util, path),
                join(folders.graceful, path.replace('graceful-watcher', '')),
            ]; */
        }
    });

    // console.log(require('@upradata/util'));


    const { LocalInstall } = await import('./local-install');
    const { processArgs } = await import('./yargs');
    const { green, yellow } = await import('./util/colors');

    new LocalInstall(processArgs()).install().then(() => {
        // console.log(green`\n\Local dependencies installed!`);
    }).catch(e => {
        console.warn(yellow`${typeof e === 'string' ? e : `${e.message}\n${e.stack}`}`);
    });

});
