#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');

const npmSaveOrSaveDev = (function () {
    const isArg = (argument) => process.argv.some((arg) => arg === '--' + argument);

    if (isArg('save'))
        return 'save';
    else if (isArg('save-dev'))
        return 'save-dev';

    console.error('Please, specify --save or --save-dev argument option');
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
        const package = process.argv[i];

        const isLocal = /^(\.|\/)/.test(package);
        if (isLocal) {
            $installPackages.push(installLocalPackages(package));
        }
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
    for (const local of packagesToBeInstalled) {

        console.log(`local package ${local.path} is installing in node_modules`);

        nodeRun.run(`npm install --${npmSaveOrSaveDev} ${local.path}`).then((exitCodes) => {
            if (exitCodes === 1)
                console.error(`npm failed to install ${local.path}`);
            else
                console.log(`local package ${local.path} is installed`);
        }, err => {
            console.error(`npm failed to install ${local.path}`);
            console.error(err);
        });
    }
}

function installLocalPackagesRecursively(localPackage) {
    const $localPackages = getLocalPackages(localPackage);

    return $localPackages.then(packages => {
        if (packages.err) {
            console.log(`Skip local package ${localPackage}`);
            return Promise.resolve('done');
        }
        else {
            if (packages.locals !== undefined) { // if there is some local project. Otherwise stop recursion
                for (const local of packages.locals) {
                    return installLocalPackages(path.join(localPackage, '/', local.path));
                }
            }
        }
    });
}


function readPackageJson(directory) {
    return new Promise((resolve, reject) => {

        const packageJson = path.join(directory, 'package.json');

        fs.readFile(packageJson, 'utf8', (err, data) => {
            if (err)
                reject({ err });
            else
                resolve(JSON.parse(data));
        });
    });
}


function getLocalPackages(directory) {

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

    }, (err) => {
        console.error(`${directory} doesn't have a package.json file`);
        return err;
    });

}
