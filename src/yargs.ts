
import yargs from 'yargs/yargs';
import { Argv } from 'yargs';
import { YargsAddArgument } from './yargs-add-argv';


/* const yargsOption = {
    command: 'run',
    aliases: '$0',
    describe: 'Npm Local Install',
    builder: (yargs) => 1 === 1,
    handler: ''
};*/


export interface ProgramArgvInput {
    'install-dir'?: string;
    verbose: boolean;
    force: boolean;
}

export interface ProgramArgv extends ProgramArgvInput {
    localPackages?: string[];
    installDir?: string;
}

export function processArgs() {
    const yargv = yargs(process.argv.slice(2), undefined, require) as Argv<ProgramArgv>;
    const addArg = new YargsAddArgument(yargv);

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

    addArg.addOption('force', {
        type: 'boolean',
        default: false,
        alias: 'f',
        describe: 'force package installation'
    });

    addArg.addOption('verbose', {
        type: 'boolean',
        default: false,
        alias: 'v',
        describe: 'enable verbose mode'
    });

    const argv = yargv.help().argv;


    console.log('Npm Local Install\n');

    addArg.unvalidParamsAndExit(argv);

    const localPackages = argv.localPackages = argv.localPackages || argv._ || [];

    for (let i = 0; i < argv.localPackages.length; ++i)
        localPackages[ i ] = localPackages[ i ].trim();

    return argv;
}
