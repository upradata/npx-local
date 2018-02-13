const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');
const glob = require('glob');
const mv = require('mv');
const move = require('glob-move');
const rimraf = require('rimraf');
require('colors');

const readJson = require('./readJson');


const argv = require('yargs')
    .usage('$0', 'Npm Local Install', (yargs) => {
        yargs.
            positional('outDir', {
                type: 'string',
                describe: 'outDir option for tsc'
            }).
            positional('rootDir', {
                type: 'string',
                describe: 'rootDir option for tsc'
            });
    }, function (argv) {
        console.log('Tsc Local Compile');
    })
    .help()
    .argv;


function tsc() {
    readJson('./', 'tsconfig.json').then(json => {

        const outDir = argv.outDir || json.compilerOptions.outDir;
        // let rootDir = argv.rootDir || json.compilerOptions.rootDir;
        const sources = includesNotNodeModules(json);
        if (sources.length === 0) {
            console.warn(`include in tsconfig.json doesn't include a NO node_modules folder. No need to flatten it`.yellow);
        }

        if (outDir === undefined) {
            console.warn('outDir is not set. No needed to flatten'.yellow);
            process.exit(1);
        }

        /* if (rootDir === undefined) {
            console.warn('rootDir is not set. The default ./src folder will be used'.yellow);
            rootDir = 'src';
        }
        rootDir = 'src'; // for now
        */

        $rm(outDir).then(() => {

            let command = 'tsc -p . ';
            for (let i = 2; i < process.argv.length; ++i)
                command = command + process.argv[i] + ' ';

            nodeRun.run(command, {
                // onData: data => { console.log(data); },
                onError: (data) => {
                    // packagesToBeInstalled.failed = true;
                    // console.error(`cacac`);
                },
                onDone: (code) => {
                    if (code !== 1)
                        flattenSrcDir(outDir, sources);
                },
                verbose: true
            });
        },
            err => console.error(err)
        );
    },
        err => {
            console.error(`A problem occured trying to read the tsconfig.json`);
            console.error(err);
        });

}


tsc();
// flattenSrcDir();


function $includesNotNodeModules(local) {
    return readJson(local, 'tsconfig.json').then(json => {
        return includesNotNodeModules(json);
    },
        err => {
            console.error(`A problem occured trying to read the tsconfig.json`);
            console.error(err);
        });
}


function includesNotNodeModules(json) {
    const includes = json.include;
    return includes === undefined ? [] : includes.filter(path => !path.startsWith('node_modules'));
}


function $flattenAll(directory, sources) {
    let allPromises = [];

    for (const source of sources) {
        allPromises.push($flatten(directory, source));
    }

    return Promise.all(allPromises);
}


function flattenSrcDir(outDir, sources) {

    let allPromises = [];

    allPromises.push($flattenAll(outDir, sources));

    const outDirNodeModules = path.join(outDir, 'node_modules');
    fs.readdir(outDirNodeModules, function (err, items) {
        if (err) {
            console.error(`A problem occured trying to read the directory? ${outDirNodeModules}`);
            console.error(err);
        } else {

            for (let i = 0; i < items.length; i++) {
                // const isDir = fs.lstatSync(path.join(outDirNodeModules, items[i])).isDirectory(); // to be sure

                // if (isDir) {*
                const localPackage = items[i];
                const local = path.join(outDirNodeModules, localPackage);
                const $flattenLocal = $includesNotNodeModules(path.join('node_modules', localPackage)).then(
                    sources => {
                        console.warn(`${local} package has no include in tsconfig.json doesn't include a NO node_modules folder. No need to flatten it`);
                        return $flattenAll(local, sources);
                    },
                    err => err
                );

                allPromises.push($flattenLocal);
                // }
            }

            Promise.all(allPromises).then(() =>
                console.log(`${outDir} had been flattened`.green),
                err => {
                    console.error(`${outDir} has failed to flatten`.red);
                    console.error(err);
                });

        }
    });

}


function $flatten(directory, source) {
    return new Promise((resolve, reject) => {

        const pattern = path.join(directory, source, '/*');

        $getGlobFiles(pattern).then(files => {
            const allPromises = [];

            for (const file of files) {
                allPromises.push(
                    $moveFile(file, path.join(directory, path.basename(file)))
                );
            }

            Promise.all(allPromises).then(
                () => $rm(path.join(directory, source)).then(() => resolve('done'), err => reject(err)),
                err => reject(err));

        },
            err => reject(err));
    });
}


function $rm(fileOrDir) {
    return new Promise((resolve, reject) => {
        rimraf(fileOrDir, {}, err => {
            if (err)
                reject(err);
            else
                resolve('done');
        });
    });
}

function $moveFile(from, to) {
    return new Promise((resolve, reject) => {
        mv(from, to, function (err) {
            // done. it tried fs.rename first, and then falls back to
            // piping the source file to the dest file and then unlinking
            // the source file
            if (err)
                reject(err);
            else
                resolve('done');
        });
    });
}

function $getGlobFiles(pattern) {
    return new Promise((resolve, reject) => {
        glob(pattern, null, function (err, files) {
            if (err)
                reject(err);
            else
                resolve(files);
        });
    });
}

module.exports = flattenSrcDir;