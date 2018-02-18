#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const util = require('util');
const $symlink = util.promisify(fs.symlink);
const $mkdir = util.promisify(fs.mkdir);
const $lstat = util.promisify(fs.lstat);
const $readlink = util.promisify(fs.readlink);

// const nodeRun = require('node-run-cmd');
const runShell = require('./runShell');
/* const colors =*/ require('colors');
const StringDecoder = require('string_decoder').StringDecoder;

const $readJson = require('./readJson5');

/* const yargsOption = {
    command: 'run',
    aliases: '$0',
    describe: 'Npm Local Install',
    builder: (yargs) => 1 === 1,
    handler: ''
};*/

const addArg = require('./yargs-addArgv');

const argv = require('yargs')
    .usage('$0 [save|save-dev] [tsconfig] [install-dir] <localPackages..>', 'Npm Local Install', function (yargs) {
        addArg.addSupportedArgs('localPackages');

        addArg('save', {
            type: 'boolean',
            describe: 'save in package.json',
            default: undefined
        }, yargs);

        addArg('save-dev', {
            type: 'boolean',
            describe: 'save-dev in package.json',
            default: undefined,
            conflicts: 'save'
        }, yargs);

        addArg('tsconfig', {
            type: 'boolean',
            describe: 'enable tsconfig paths field generation for local packages'
        }, yargs);


        addArg('install-dir', {
            type: 'string',
            default: 'node_modules',
            describe: 'directory where to install local packages'
        }, yargs);


        this.showHelp = yargs.showHelp.bind(yargs);

    }, function (argv) {
        console.log('Npm Local Install');

        addArg.unvalidParamsAndExit(argv, this.showHelp);

        if (argv.save === undefined && argv.saveDev === undefined) {
            console.error(`it's missing --save or --save-dev. Check --help`.red);
            process.exit(1);
        }

        for (let i = 0; i < argv.localPackages.length; ++i)
            argv.localPackages[i] = argv.localPackages[i].trim();

    })
    .help()
    .argv;

// console.log(argv);
// process.exit(1);

const npmSaveOrSaveDev = argv.save ? 'save' : 'save-dev';

const packagesToBeInstalled = {
    locals: [],
    dependencies: {},
};


install();


function install() {
    const $$installPackages = [];

    for (const pkg of argv.localPackages) {

        const isLocal = /^(\.|\/)/.test(pkg);
        if (isLocal)
            $$installPackages.push($installLocalPackages(pkg));
        else
            console.warn(`Skip not local package ${pkg}`.yellow);

    }


    Promise.all($$installPackages).then(
        () => npmInstallLocalPackages(),
        done => console.log(done.green)
    );
}


const PackageType = {
    locals: 0,
    dependencies: 1
};

function isAlreadyInstalled(packageName, packageType) {
    if (packageType === PackageType.locals)
        return packagesToBeInstalled.locals.some(pkg => pkg.name === packageName);
    else
        return Object.keys(packagesToBeInstalled.dependencies).some(depName => depName === packageName);

    // const packages = packageType === PackageType.locals ? packagesToBeInstalled.locals : packagesToBeInstalled.dependencies;
    // return packages.some(pkg => pkg.name === packageName);
}

function isVersionExists(dependency) {
    return Object.values(packagesToBeInstalled.dependencies).some(dep => dep.versions.some(version => version === dependency.version));
}


function $installLocalPackages(localPath) {
    if (!fs.existsSync(localPath)) {
        const msg = `${localPath} doesn't exist`;
        console.error(msg.red);
        return Promise.reject(msg);
    }

    return $readJson(localPath, 'package.json').then(packageJson => {

        const localPackages = getLocalPackages(packageJson);

        if (!isAlreadyInstalled(packageJson.name, PackageType.locals)) {
            packagesToBeInstalled.locals.push({
                name: packageJson.name,
                path: localPath
            });

            if (localPackages.dependencies !== undefined) {

                for (const dep of localPackages.dependencies) {
                    if (!isAlreadyInstalled(dep.name, PackageType.dependencies))
                        packagesToBeInstalled.dependencies[dep.name] = {
                            versions: [dep.version],
                            localPath: dep.localPath
                        };
                    else if (!isVersionExists(dep))
                        packagesToBeInstalled.dependencies[dep.name].versions.push(dep.version);
                }
            }


            if (localPackages.locals !== undefined) { // if there is some local project. Otherwise stop recursion
                for (const local of localPackages.locals)
                    return $installLocalPackages(path.join(localPath, '/', local.path));

            }

        } else
            return Promise.resolve('done');
    },
        err => Promise.reject(err));

}


function getLocalPackages(packageJson) {

    // const allDependencies = Object.assign({}, packageJson.dependencies, packageJson.devDependencies);

    const localPakages = [];
    const dependencies = [];

    for (let [name, version] of Object.entries(packageJson.dependencies)) {
        if (version.startsWith('file')) { // file:.... local project
            // version in this case is the project path
            const path = version.split('file:')[1];

            localPakages.push({ name, path });
        }/* else
                dependencies.push({
                    name,
                    version,
                    localPath: directory
                });*/
    }

    for (let [name, version] of Object.entries(packageJson.devDependencies)) {
        if (name.startsWith('@types'))
            dependencies.push({
                name,
                version
            });
    }


    const locals = Object.keys(localPakages).length === 0 ? undefined : localPakages;
    return { locals, dependencies };
}


function npmInstallLocalPackages() {
    /* if (argv.installDir !== 'node_modules') {
        $createSymLink().then(() => {
            console.log();
            logRecap();
        });

    }*/

    if (packagesToBeInstalled.locals.length > 0) {

        if (argv.tsconfig) {
            console.log('tsconfig paths and include/exlucde generation'.green);
            generateTsconf();
        }


        const command = `npm`;
        let args = `install --${npmSaveOrSaveDev} --color=always`.split(' ');
        // let command = `npm install --${npmSaveOrSaveDev} --color=always `;

        for (const local of packagesToBeInstalled.locals) {
            // command = command + local.path + ' ';
            args.push(local.path);
        }

        for (const [depName, dep] of Object.entries(packagesToBeInstalled.dependencies)) {
            if (dep.versions.length > 1) {
                console.warn(`Few versions for ${depName} found in:`.yellow);
                for (const version of dep.versions)
                    console.warn(`  - ${version}`.yellow);
                console.warn(`npm install ${depName} without version`.yellow);
                // command = command + `${depName} `;
                args.push(depName);
            }
            else {
                // command = command + `${depName}@${dep.versions[0]} `;
                args.push(`${depName}@">=${dep.versions[0]}"`);
                // args.push(depName);
            }
        }


        const npm$ = runShell(command, args);
        console.log(`${command} ${args.join(' ')}`);
        const idInterval = setInterval(() => process.stdout.write('.'), 300);

        const decoder = new StringDecoder('utf8');
        npm$.subscribe({
            next: (err, data) => {
                if (err !== null)
                    console.log(decoder.write(err));

                if (data !== undefined)
                    console.log(decoder.write(data));

            }, // JSON.stringify((err ? err : data).toString('utf8'))),
            error: err => console.error('npm install: something wrong occurred: '.red, decoder.write(err)),
            complete: (code) => {
                clearInterval(idInterval);

                if (code !== 1) {
                    if (argv.installDir !== 'node_modules') {
                        $createSymLink().then(() => {
                            console.log();
                            logRecap();
                        });

                    } else
                        logRecap();
                }
            }
        });
        // console.log(`local package ${local.path} is installing in node_modules`);
        /*
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
 
                    console.log('\nLocal Dependencies Install Recap:'.underline.black.bgCyan);
                    for (const depName of Object.keys(packagesToBeInstalled.dependencies)) {
                        console.log(`local package ${depName} is installed`.green);
                    }
                }
            },
            verbose: true
        });
        */
    }
}

function $existsSymLink(path) {
    return $lstat(path).then(() => {
        return $readlink(path).then(
            origin => Promise.resolve(true),
            err => Promise.resolve(false));
    },
        err => Promise.resolve(false)
    );
}

function $createSymLink() {
    const promiseAll = [];
    console.log(`Creation of symlinks in ${argv.installDir}`.green);

    for (const local of packagesToBeInstalled.locals) {
        const link = path.join(argv.installDir, local.name);
        const origin = path.join('node_modules', local.name);

        const $notExists = $existsSymLink(link).then(exist => {
            if (exist) {
                return Promise.reject();
            }
            else
                return Promise.resolve();
        });

        const $link = $notExists.then(() => {

            let $dirCreated = Promise.resolve('done');

            if (!fs.existsSync(argv.installDir))
                $dirCreated = $mkdir(argv.installDir);

            return $dirCreated.then(
                () => {
                    return $symlink(path.resolve(origin), path.resolve(link)).then(
                        () => console.log(`Creation of symlink ${link} --> ${origin}`.green),
                        err => console.error(err)
                    );
                },
                err => console.error(err)
            );

        },
            err => console.log(`symlink ${link} --> ${origin} already exists`.yellow)
        );

        promiseAll.push($link);
    }

    return Promise.all(promiseAll,
        () => Promise.resolve('done'),
        err => Promise.reject(err) // impossible
    );
}

function logRecap() {
    console.log('Local Packages Install Recap:'.underline.black.bgCyan);
    for (const local of packagesToBeInstalled.locals) {
        console.log(`local package ${local.path} is installed`.green);
    }

    console.log('\nLocal Dependencies Install Recap:'.underline.black.bgCyan);
    for (const depName of Object.keys(packagesToBeInstalled.dependencies)) {
        console.log(`local package ${depName} is installed`.green);
    }
}


function $includesNotNodeModules(local) {
    return $readJson(local, 'tsconfig.json').then(tsconfig => {
        return includesNotNodeModules(tsconfig);
    },
        err => {
            console.error(`A problem occured trying to read the tsconfig.json`.red);
            console.error(err);
            return Promise.reject('done');
        });
}


function includesNotNodeModules(tsconfig) {
    const includes = tsconfig.include;
    return includes === undefined ? [] : includes.filter(path => !path.startsWith('node_modules'));
}


function generateTsconf() {
    const locals = packagesToBeInstalled.locals;

    const tsconfigFile = 'tsconfig.json';// path.join(local.path, 'tsconfig.json');
    let $tsconfigJson = undefined;

    // "paths": {
    // "stickies/*": [
    //    "node_modules/stickies/src/*", ...

    const pathExists = (name, paths) => Object.keys(paths).some(path => path.split('/')[0] === name);

    if (!fs.existsSync(tsconfigFile))
        $tsconfigJson = Promise.resolve({});
    else
        $tsconfigJson = $readJson('.', tsconfigFile);

    const $$promiseAll = [];

    $tsconfigJson.then((tsconfigJson) => {
        if (tsconfigJson.compilerOptions === undefined) tsconfigJson.compilerOptions = {};
        if (tsconfigJson.compilerOptions.paths === undefined) tsconfigJson.compilerOptions.paths = {};

        if (tsconfigJson.include === undefined) tsconfigJson.include = {};
        if (tsconfigJson.exclude === undefined) tsconfigJson.exclude = {};

        if (tsconfigJson.compilerOptions.baseUrl === undefined) tsconfigJson.compilerOptions.baseUrl = '.';

        const paths = tsconfigJson.compilerOptions.paths;


        for (const local of locals) {
            const $tsconfigJsonLocal = $includesNotNodeModules(local.path);
            const $packageJsonLocal = $readJson(local.path, 'package.json');

            Promise.all([$tsconfigJsonLocal, $packageJsonLocal]).then(([sources, packageJson]) => {
                if (sources.length === 0)
                    console.warn(`${local.path}/tsconfig.json has no entry in include section (other than node_modules).
                    Skip ${local.name} tsconfig paths configuration (not necessary)`.yellow);
                else if (sources.length > 1) {
                    console.warn(`${local.name}/tsconfig.json local package has more than 1 entry in include section (other than node_modules)`.yellow);
                    console.warn(`this feature is NOT implemented. Skip ${local.name} tsconfig paths configuration`);
                } else {
                    const source = sources[0].split('/')[0]; // can be a glob -> "src/**/*.ts"
                    const packageName = packageJson.name;

                    const key = `${packageName}/*`;
                    const path = `node_modules/${packageName}/${source}/*`;


                    if (!pathExists(local.name, paths))
                        paths[key] = [path];
                    else {
                        if (paths[key].indexOf(path) === -1) // if it doesn't exist already
                            paths[key].push(path);
                    }

                    generateTsIncludeExclude(tsconfigJson, packageName);

                    const $writeTsconfig = new Promise((resolve, reject) => {
                        fs.writeFile('tsconfig.json', JSON.stringify(tsconfigJson, null, 4), err => {
                            if (err) reject(err);
                            resolve(`${path} has been added to paths:${key} in ./tsconfig.json`);
                        });
                    });

                    $$promiseAll.push($writeTsconfig);
                }

            },
                err => console.error(err.red));
        }

    }, err => console.error(err));

    Promise.all($$promiseAll).then(messages => {
        for (const msg of messages)
            console.log(msg.green);
    },
        err => console.error(err.red));
}

function generateTsIncludeExclude(tsconfigJson, packageName) {

    const arrayExists = (include, includes) => includes.some(incl => incl === include);

    const includes = tsconfigJson.include;

    const include = `${argv.installDir}/${packageName}`;
    if (!arrayExists(include, includes))
        includes.push(include);

    if (argv.installDir === 'node_modules') {
        const excludes = tsconfigJson.exclude;

        const exclude = `node_modules/[!${packageName}]`;
        if (!arrayExists(exclude, excludes))
            excludes.push(exclude);

    }

}
