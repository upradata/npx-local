
import yargs from 'yargs/yargs';
import { Argv } from 'yargs';
import { YargsAddArgument } from './yargs-add-argv';
import { LocalInstallOptions } from './local-install.options';


export interface ProgramArgv extends LocalInstallOptions {
    'install-dir'?: string;
}

export function processArgs() {
    const yargv = yargs(process.argv.slice(2), undefined, require) as Argv<ProgramArgv>;
    const addArg = new YargsAddArgument(yargv);

    yargv.command([ 'install', '$0' ], 'npmlocal install local dependencies');

    addArg.addOption('local-packages', {
        type: 'array',
        alias: 'l',
        describe: 'local packages to install'
    });

    addArg.addOption('install-dir', {
        type: 'string',
        default: './',
        alias: 'd',
        describe: 'directory where to install local packages'
    });

    addArg.addOption('mode', {
        type: 'string',
        default: 'link',
        alias: 'm',
        describe: 'choose if the local dependency files are copied or linked in node_modules'
    });

    addArg.addOption('force', {
        type: 'boolean',
        default: false,
        alias: 'f',
        describe: 'force package installation'
    });

    addArg.addOption('verbose', {
        type: 'count',
        default: 0,
        alias: 'v',
        describe: 'enable verbose mode'
    });


    addArg.addOption('watch', {
        type: 'boolean',
        default: false,
        alias: 'w',
        describe: 'enable watch mode'
    });

    const argv = yargv.help().argv;


    console.log('Npm Local Install\n');

    addArg.unvalidParamsAndExit(argv);

    const localPackages = argv.localPackages = argv.localPackages || argv._ || [];

    for (let i = 0; i < argv.localPackages.length; ++i)
        localPackages[ i ] = localPackages[ i ].trim();

    return argv;
}
