
import { isInstallMode, LocalInstallOptions, LocalPackage, InstallModes } from './local-install.options';
import findUp from 'find-up';
import yargsParser from 'yargs-parser';
import { Arguments } from 'yargs';
import { readPackageJson, ParseArgs, InvalidParameter } from '@upradata/node-util';


export interface ProgramArgv extends LocalInstallOptions<string> {
    'project-dir': string;
    'install-dir': string;
    help: boolean;
}


export class ParseNpmLocalArgs extends ParseArgs<ProgramArgv>{
    private _localPackages: LocalPackage[] = [];

    constructor() {
        super();
    }

    public get localPackages() {
        return this._localPackages;
    }

    public processLocalPackages() {
        const argv = (this.yargs.parsed as yargsParser.DetailedArguments).argv as any as Arguments<ProgramArgv>;

        const localPackages = argv.localPackages = argv.localPackages || argv._ || [];
        const invalidLocalPackages: InvalidParameter[] = [];

        for (let i = 0; i < argv.localPackages.length; ++i) {
            const local = localPackages[ i ];

            localPackages[ i ] = local.trim();
            const [ path, mode ] = local.split(':');
            if (mode && !isInstallMode(mode)) {
                invalidLocalPackages.push({
                    parameter: 'mode',
                    reason: `mode ${mode} in "${local}" is not a valid mode. Valid modes are ${Object.keys(new InstallModes())}`
                });
            }

            this.localPackages.push({ path, mode: mode as any });
        }

        return invalidLocalPackages;
    }

    public invalidParams(argv: Arguments<any>) {
        const invalidLocalPackages = this.processLocalPackages();
        return [ ...invalidLocalPackages, ...super.invalidParams(argv) ];
    }
}

export function processArgs(): Arguments<LocalInstallOptions<LocalPackage>> {
    const yargs = new ParseNpmLocalArgs() as (ParseNpmLocalArgs & ParseArgs<ProgramArgv>);

    // Does not work as expectd. To permissive
    // yargs.strict(true);

    yargs.command([ 'install', '$0' ], 'npmlocal install local dependencies');
    yargs.version(readPackageJson.sync(findUp.sync('package.json', { cwd: __dirname })).version);

    yargs.option('local-packages', {
        type: 'array',
        alias: 'l',
        describe: 'Local packages to install'
    });

    yargs.option('project-dir', {
        type: 'string',
        default: './',
        alias: 'p',
        describe: 'Directory of project where to install local dependencies'
    });

    yargs.option('install-dir', {
        type: 'string',
        default: 'node_modules',
        alias: 'i',
        describe: 'Directory where to install local packages (node_modules per default)'
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

    yargs.invalidParamsAndExit(argv);


    return { ...argv, localPackages: yargs.localPackages };
}
