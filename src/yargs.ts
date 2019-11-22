
import { LocalInstallOptions } from './local-install.options';
import { readJsonSync } from './read-json5';
import findUp from 'find-up';
import { ParseArgs } from './parse-args';

export interface ProgramArgv extends LocalInstallOptions {
    'install-dir': string;
    help: boolean;
}

export function processArgs() {
    const yargs = new ParseArgs<ProgramArgv>() as ParseArgs<ProgramArgv>;

    // Does not work as expectd. To permissive
    // yargs.strict(true);

    yargs.command([ 'install', '$0' ], 'npmlocal install local dependencies');
    yargs.version(readJsonSync(findUp.sync('package.json', { cwd: __dirname })).version);

    yargs.option('local-packages', {
        type: 'array',
        alias: 'l',
        describe: 'Local packages to install'
    });

    yargs.option('install-dir', {
        type: 'string',
        default: './',
        alias: 'd',
        describe: 'Directory where to install local packages'
    });

    yargs.option('mode', {
        type: 'string',
        default: 'link',
        alias: 'm',
        describe: 'Choose if the local dependency files are copied or linked in node_modules'
    });

    yargs.option('force', {
        type: 'boolean',
        default: false,
        alias: 'f',
        describe: 'Force package installation'
    });

    yargs.option('verbose', {
        type: 'count',
        default: 0,
        alias: 'v',
        describe: 'Enable verbose mode'
    });


    yargs.option('watch', {
        type: 'boolean',
        default: false,
        alias: 'w',
        describe: 'Enable watch mode'
    });

    yargs.option('help', {
        type: 'boolean',
        default: false,
        alias: 'h',
        describe: 'Show this help'
    });

    yargs.middleware(argv => {
        // help is done by yargs by default
        if (argv.h) {
            yargs.showHelp();
            process.exit(1);
        }
    });


    const argv = yargs.help().argv;


    console.log('Npm Local Install\n');

    yargs.unvalidParamsAndExit(argv);

    const localPackages = argv.localPackages = argv.localPackages || argv._ || [];

    for (let i = 0; i < argv.localPackages.length; ++i)
        localPackages[ i ] = localPackages[ i ].trim();

    return argv;
}
