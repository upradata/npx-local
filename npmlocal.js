#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');
/* const colors =*/ require('colors');


const argv = require('yargs')
    .usage('$0', 'Npm Local Install', (yargs) => {
        yargs.
            positional('save', {
                type: 'boolean',
                describe: 'save in package.json',
                conflicts: 'ZZZsave-dev'
            }).
            positional('save-dev', {
                type: 'boolean',
                describe: 'save-dev in package.json'
            }).
            positional('tsconfig-path', {
                type: 'boolean',
                describe: 'enable tsconfig paths field generation for local packages'
            }).
            positional('rootDir', {
                type: 'string',
                default: 'src',
                describe: 'force rootDir of local packages for the tsconfig paths generation'
            });
    }, function (argv) {
        console.log('Npm Local Install');

        if (argv.save === undefined || argv.saveDev === undefined) {
            console.error(`it's missing --save or --save-dev. Check --help`.red);
            process.exit(1);
        }

        if (argv._.length === 0) {
            console.error(`Please, specify local packages to install. Check --help`.red);
            process.exit(1);
        }
    })
    .help()
    .argv;


const npmSaveOrSaveDev = argv.save ? 'save' : 'save-dev';

const packagesToBeInstalled = [];


install();

function getPackage(packagePath) {
    return path.basename(packagePath);
}

function isAlreadyInstalled(packagePath) {
    return packagesToBeInstalled.some(package => package.name === packagePath);
}


function install() {
    const $installPackages = [];

    for (const package of argv._) {

        const isLocal = /^(\.|\/)/.test(package);
        if (isLocal)
            $installPackages.push(installLocalPackages(package));
        else
            console.warn(`Skip not local package ${package}`.yellow);

    }


    Promise.all($installPackages).then(() => npmInstallLocalPackages());
}

function installLocalPackages(localPackage) {
    if (!isAlreadyInstalled(getPackage(localPackage))) {
        packagesToBeInstalled.push({
            name: getPackage(localPackage),
            path: localPackage
        });

        return installLocalPackagesRecursively(localPackage);
    } else {
        return Promise.resolve('done');
    }
}

function generateTsconfPaths(locals) {
    const tsconfigFile = 'tsconfig.json';// path.join(local.path, 'tsconfig.json');
    let tsconfigJson = undefined;

    const pathExist = (name, paths) => Object.keys(paths).some(path => path.split('/')[0] === name);

    if (!fs.existsSync(tsconfigFile))
        tsconfigJson = Promise.resolve({});
    else
        tsconfigJson = readJson('.', tsconfigFile);

    tsconfigJson.then((json) => {
        if (json.compilerOptions === undefined) json.compilerOptions = {};
        if (json.compilerOptions.paths === undefined) json.compilerOptions.paths = {};

        const paths = json.compilerOptions.paths;

        for (const local of locals) {
            readJson(local.path, 'package.json').then(packageJson => {
                const packageName = packageJson.name;

                const key = `${packageName}/*`;
                const value = `node_modules/${local.name}/${argv.rootDir}/*`;

                if (!pathExist(local.name, paths))
                    paths[key] = [ // attention, il faut chercher dans package.json le vrai nom!!!!
                        value
                    ];
                else {
                    if (paths[key].indexOf(value) === -1)
                        paths[key].push(value);
                }


                fs.writeFile('tsconfig.json', JSON.stringify(json), (err) => {
                    if (err) throw err;
                    console.log('The file has been saved!');
                });
            }, err => err);
        }

    }, err => err);
}

function npmInstallLocalPackages() {
    if (packagesToBeInstalled.length > 0) {

        if (argv.tsconfigPath)
            generateTsconfPaths(packagesToBeInstalled);


        let command = `npm install --${npmSaveOrSaveDev} --color=always `;

        for (const local of packagesToBeInstalled) {
            command = command + local.path + ' ';
        }


        // console.log(`local package ${local.path} is installing in node_modules`);
        nodeRun.run(command, {
            // onData: data => { console.log(data); },
            onError: (data) => {
                // packagesToBeInstalled.failed = true;
                // console.error(`npm failed to install ${local.path}`);
            },
            onDone: (code) => {
                console.log('Local Packages Install Recap:'.underline.black.bgCyan);
                for (const local of packagesToBeInstalled) {
                    console.log(`local package ${local.path} is installed`.green);
                }
            },
            verbose: true
        });
    }
}


function installLocalPackagesRecursively(localPackage) {
    const $localPackages = getLocalPackages(localPackage);

    return $localPackages.then(packages => {
        if (packages.err) {
            console.warn(`Skip local package ${localPackage}`.yellow);
            return Promise.reject('done');
        }
        else {
            if (packages.locals !== undefined) { // if there is some local project. Otherwise stop recursion
                for (const local of packages.locals) {
                    return installLocalPackages(path.join(localPackage, '/', local.path));
                }
            }
        }

    }, (err) => {
        console.warn(`Skip local package ${localPackage}`.yellow);
        return Promise.reject('done');
    });
}


function readJson(directory, filename) {
    return new Promise((resolve, reject) => {

        const file = path.join(directory, filename);

        if (!fs.existsSync(file)) {
            const msg = `${file} doesn't exist`;
            console.error(msg.red);
            reject({ err: msg });
        }

        fs.readFile(file, 'utf8', (err, data) => {
            if (err)
                reject({ err });
            else
                resolve(data === '' ? {} : JSON.parse(data));
        });
    });
}


function getLocalPackages(directory) {
    if (!fs.existsSync(directory)) {
        const msg = `${directory} doesn't exist`;
        console.error(msg.red);
        return Promise.reject({ err: msg });
    }


    return readJson(directory, 'package.json').then((packageJson) => {
        const dependencies = packageJson.dependencies;

        let localPakages = [];


        for (let name of Object.getOwnPropertyNames(dependencies)) {
            if (dependencies[name].startsWith('file')) { // file:.... local project
                const dep = dependencies[name];
                const path = dep.split('file:')[1];

                localPakages.push({ name, path });
            }
        }

        return {
            err: null,
            locals: Object.getOwnPropertyNames(localPakages).length === 0 ? undefined : localPakages
        };

    }, (err) => err);
}
