#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const nodeRun = require('node-run-cmd');
/* const colors =*/ require('colors');

const $readJson = require('./readJson5');


const argv = require('yargs')
    .usage('$0', 'Npm Local Install', (yargs) => {
        yargs.
            positional('save', {
                type: 'boolean',
                describe: 'save in package.json',
                default: undefined,
                conflicts: 'save-dev'
            }).
            positional('save-dev', {
                type: 'boolean',
                describe: 'save-dev in package.json',
                default: undefined
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

        if (argv.save === undefined && argv.saveDev === undefined) {
            console.error(`it's missing --save or --save-dev. Check --help`.red);
            process.exit(1);
        }

        if (argv._.length === 0) {
            console.error(`Please, specify local packages to install. Check --help`.red);
            process.exit(1);
        }

        for (let i = 0; i < argv._.length; ++i)
            argv._[i] = argv._[i].trim();

    })
    .help()
    .argv;


const npmSaveOrSaveDev = argv.save ? 'save' : 'save-dev';

const packagesToBeInstalled = {
    locals: [],
    dependencies: [],
};


install();

function getPackage(packagePath) {
    return path.basename(packagePath);
}

const PackageType = {
    locals: 0,
    dependencies: 1
};

function isAlreadyInstalled(packagePath, packageType) {
    const packages = packageType === PackageType.locals ? packagesToBeInstalled.locals : packagesToBeInstalled.dependencies;
    return packages.some(pkg => pkg.name === packagePath);
}


function install() {
    const $installPackages = [];

    for (const pkg of argv._) {

        const isLocal = /^(\.|\/)/.test(pkg);
        if (isLocal)
            $installPackages.push($installLocalPackages(pkg));
        else
            console.warn(`Skip not local package ${pkg}`.yellow);

    }


    Promise.all($installPackages).then(
        () => npmInstallLocalPackages(),
        done => console.log(done.green)
    );
}


function $installLocalPackages(localPath) {

    return $getLocalPackages(localPath).then(localPackages => {
        if (!isAlreadyInstalled(getPackage(localPath), PackageType.locals)) {
            packagesToBeInstalled.locals.push({
                name: getPackage(localPath),
                path: localPath
            });

            if (localPackages.dependencies !== undefined) {

                for (const dep of localPackages.dependencies) {
                    if (!isAlreadyInstalled(dep.name, PackageType.dependencies))
                        packagesToBeInstalled.dependencies.push(dep);

                }
            }


            if (localPackages.locals !== undefined) { // if there is some local project. Otherwise stop recursion
                for (const local of localPackages.locals)
                    $installLocalPackages(path.join(localPath, '/', local.path));

            }

        } else
            return Promise.resolve('done');

    }, err => {
        console.warn(`Skip local package ${localPath}`.yellow);
        return Promise.resolve('done');
    });

}


function npmInstallLocalPackages() {

    if (packagesToBeInstalled.locals.length > 0) {

        if (argv.tsconfigPath)
            generateTsconfPaths();


        let command = `npm install --${npmSaveOrSaveDev} --color=always `;

        for (const local of packagesToBeInstalled.locals) {
            command = command + local.path + ' ';
        }

        for (const dep of packagesToBeInstalled.dependencies) {
            command = command + dep.name + ' ';
        }


        // console.log(`local package ${local.path} is installing in node_modules`);
        nodeRun.run(command, {
            // onData: data => { console.log(data); },
            onError: (data) => {
                // packagesToBeInstalled.failed = true;
                // console.error(`npm failed to install ${local.path}`);
            },
            onDone: (code) => {
                if (code !== 1) {
                    console.log('Local Packages Install Recap:'.underline.black.bgCyan);
                    for (const local of packagesToBeInstalled.locals) {
                        console.log(`local package ${local.path} is installed`.green);
                    }
                }
            },
            verbose: true
        });
    }
}


function $getLocalPackages(directory) {
    if (!fs.existsSync(directory)) {
        const msg = `${directory} doesn't exist`;
        console.error(msg.red);
        return Promise.reject(msg);
    }


    return $readJson(directory, 'package.json').then((packageJson) => {
        const allDependencies = packageJson.dependencies;

        const localPakages = [];
        const dependencies = [];

        for (let name of Object.keys(allDependencies)) {
            if (allDependencies[name].startsWith('file')) { // file:.... local project
                const dep = allDependencies[name];
                const path = dep.split('file:')[1];

                localPakages.push({ name, path });
            } else
                dependencies.push({
                    name,
                    version: allDependencies[name]
                });
        }

        const locals = Object.keys(localPakages).length === 0 ? undefined : localPakages;
        return { locals, dependencies };

    }, err => Promise.reject(err));
}


function $includesNotNodeModules(local) {
    return $readJson(local, 'tsconfig.json').then(json => {
        return includesNotNodeModules(json);
    },
        err => {
            console.error(`A problem occured trying to read the tsconfig.json`);
            console.error(err);
            return Promise.reject('done');
        });
}


function includesNotNodeModules(json) {
    const includes = json.include;
    return includes === undefined ? [] : includes.filter(path => !path.startsWith('node_modules'));
}


function generateTsconfPaths() {
    const locals = packagesToBeInstalled.locals;

    const tsconfigFile = 'tsconfig.json';// path.join(local.path, 'tsconfig.json');
    let $tsconfigJson = undefined;

    // "paths": {
    // "stickies/*": [
    //    "node_modules/stickies/src/*", ...

    const pathExist = (name, paths) => Object.keys(paths).some(path => path.split('/')[0] === name);

    if (!fs.existsSync(tsconfigFile))
        $tsconfigJson = Promise.resolve({});
    else
        $tsconfigJson = $readJson('.', tsconfigFile);

    $tsconfigJson.then((tsconfigJson) => {
        if (tsconfigJson.compilerOptions === undefined) tsconfigJson.compilerOptions = {};
        if (tsconfigJson.compilerOptions.paths === undefined) tsconfigJson.compilerOptions.paths = {};

        const paths = tsconfigJson.compilerOptions.paths;

        for (const local of locals) {
            const $tsconfigJsonLocal = $includesNotNodeModules(local.path);
            const $packageJsonLocal = $readJson(local.path, 'package.json');

            Promise.all([$tsconfigJsonLocal, $packageJsonLocal]).then(([sources, packageJson]) => {
                if (sources.length === 0)
                    console.warn(`${local.path}/tsconfig.json has no entry in include section (other than node_modules).
                    Skip ${local.name} tsconfig paths configuration (not necessary)`.yellow);
                else if (sources.length > 0) {
                    console.warn(`${local.name}/tsconfig.json local package has more than 1 entry in include section (other than node_modules)`.yellow);
                    console.warn(`this feature is NOT implemented. Skip ${local.name} tsconfig paths configuration`);
                } else {
                    const source = sources[0];
                    const packageName = packageJson.name;

                    const key = `${packageName}/*`;
                    const value = `node_modules/${packageName}/${source}/*`;

                    if (!pathExist(local.name, paths))
                        paths[key] = [value];
                    else {
                        if (paths[key].indexOf(value) === -1) // if it doesn't exist already
                            paths[key].push(value);
                    }


                    fs.writeFile('tsconfig.json', JSON.stringify(tsconfigJson, null, 4), (err) => {
                        if (err) throw err;
                        console.log('The file has been saved!');
                    });
                }

            },
                err => console.error(err));
        }

    }, err => console.error(err));
}
