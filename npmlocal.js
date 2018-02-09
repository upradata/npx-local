#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');
/* const colors =*/ require('colors');

const npmSaveOrSaveDev = (function () {
    const isArg = (argument) => process.argv.some((arg) => arg === '--' + argument);

    if (isArg('save'))
        return 'save';
    else if (isArg('save-dev'))
        return 'save-dev';

    console.error('Please, specify --save or --save-dev argument option'.red);
    process.exit(1);
})();


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

    for (let i = 2; i < process.argv.length; ++i) {
        const arg = process.argv[i];
        if (arg.startsWith('-'))
            continue;

        const package = arg;

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


function npmInstallLocalPackages() {
    if (packagesToBeInstalled.length > 0) {

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


function readPackageJson(directory) {
    return new Promise((resolve, reject) => {

        const packageJson = path.join(directory, 'package.json');

        if (!fs.existsSync(packageJson)) {
            const msg = `${packageJson} doesn't exist`;
            console.error(msg.red);
            reject({ err: msg });
        }

        fs.readFile(packageJson, 'utf8', (err, data) => {
            if (err)
                reject({ err });
            else
                resolve(JSON.parse(data));
        });
    });
}


function getLocalPackages(directory) {
    if (!fs.existsSync(directory)) {
        const msg = `${directory} doesn't exist`;
        console.error(msg.red);
        return Promise.reject({ err: msg });
    }


    return readPackageJson(directory).then((packageJson) => {
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
