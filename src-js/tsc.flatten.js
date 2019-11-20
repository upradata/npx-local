#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');
const glob = require('glob');
const mv = require('mv');
// const move = require('glob-move');
const $rm = require('./rm');
require('colors');

const $readJson = require('../src/readJson5');

const addArg = require('./yargs-addArgv');

const argv = require('yargs')
    .usage('$0 [outDir] [rootDir] [no-compile]', 'Npm Local Install', function (yargs) {
        addArg.addSupportedArgs('localPackages');

        addArg('outDir', {
            type: 'string',
            describe: 'outDir option for tsc'
        }, yargs);

        addArg('rootDir', {
            type: 'string',
            describe: 'rootDir option for tsc'
        }, yargs);


        addArg('no-compile', {
            type: 'boolean',
            describe: 'Flatten without tsc compilation',
            default: false
        }, yargs);


        this.showHelp = yargs.showHelp.bind(yargs);

    }, function (argv) {
        console.log('Npm Local Install');

        addArg.unvalidParamsAndExit(argv, this.showHelp);
    })
    .help()
    .argv;


if (argv.noCompile)
    flattenSrcDir();
else
    tsc();


function tsc() {
    $readJson('./', 'tsconfig.json').then(json => {

        const outDir = argv.outDir || json.compilerOptions.outDir;
        // let rootDir = argv.rootDir || json.compilerOptions.rootDir;
        const sources = includesNotNodeModules(json);
        if (sources.length === 0) {
            console.warn(`./tsconfig.json has no entry in include section (other than node_modules). No need to flatten it`.yellow);
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
                        flattenSrcDir(outDir, sources[0].split('/')[0]); // can be a glob -> "src/**/*.ts");
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


function $includesNotNodeModules(local) {
    return $readJson(local, 'tsconfig.json').then(json => {
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
                        if (sources.length === 0)
                            console.warn(`${local}/tsconfig.json has no entry in include section (other than node_modules). No need to flatten it`.yellow);
                        else
                            return $flattenAll(local, sources[0].split('/')[0]); // can be a glob -> "src/**/*.ts"););
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
