import { findUp, oneLine, ParseArgsFactory, readPackageJson, ParseArgsCommandModule } from '@upradata/node-util';
import { LocalInstallOptions } from './local-install.options';
import { LocalInstall } from './local-install';


const installCommand = (commandName: 'install' | 'add', describe: string): ParseArgsCommandModule<LocalInstallOptions> => {
    return {
        command: commandName === 'add' ? 'add <local-packages...>' : commandName,
        describe,
        builder: y => {

            if (commandName === 'add') {
                y.option('local-packages', {
                    type: 'array',
                    alias: 'l',
                    describe: 'Local packages to install'
                });
            }

            y.option('project-dir', {
                type: 'string',
                default: './',
                alias: 'p',
                describe: 'Directory of project where to install local dependencies'
            });

            y.option('install-dir', {
                type: 'string',
                default: 'node_modules',
                alias: 'i',
                describe: 'Directory where to install local packages (node_modules per default)'
            });

            y.option('mode', {
                type: 'string',
                default: 'link',
                alias: 'm',
                describe: 'Choose if the local dependency files are copied or linked in node_modules'
            });

            /* yargs.option('force', {
                type: 'boolean',
                default: false,
                alias: 'f',
                describe: 'Force package installation'
            }); */


            y.option('find-up', {
                type: 'boolean',
                default: false,
                describe: oneLine`Enable find-up algorithm to find a package.json directory for both the project
                     where to install the dependencies and the folder where there is the local dependency`
            });

            y.option('watch', {
                type: 'boolean',
                default: false,
                alias: 'w',
                describe: 'Enable watch mode'
            });
        },

        handler: (argv, yargs) => {
            yargs.invalidParamsAndExit(argv);
            new LocalInstall(argv).install();
        }
    };
};


const copyLocalToNpmDepsCommand: ParseArgsCommandModule<LocalInstallOptions> = {
    command: 'local-to-npm',
    describe: 'copy all local dependencies to npm dependencies [package.json].dependencies/devDependencies',
    builder: y => {

        y.option('prod', {
            type: 'boolean',
            default: true,
            alias: 'P',
            describe: 'add the local dependency in [package.json].dependencies'
        });

        y.option('dev', {
            type: 'boolean',
            alias: 'dev',
            conflicts: [ 'prod' ],
            describe: 'add the local dependency in [package.json].devDependencies'
        });
    },

    handler: (argv, yargs) => {
        yargs.invalidParamsAndExit(argv);

        new LocalInstall({
            ...argv,
            npmPropertyToCopyLocalDeps: argv.dev ? 'devDependencies' : 'dependencies',
        }).copyLocalDepsToNpmProperty();
    }
};



export function runCommand() {
    const ParseArgs = ParseArgsFactory<LocalInstallOptions>();
    const yargs = new ParseArgs();


    yargs.option('verbose', {
        type: 'count',
        default: 0,
        alias: 'v',
        describe: 'Enable verbose mode'
    });


    yargs.option('quiet', {
        type: 'boolean',
        default: false,
        alias: 'q',
        describe: 'Enable quiet mode'
    });


    yargs.option('help', {
        type: 'boolean',
        default: false,
        alias: 'h',
        describe: 'Show this help'
    });


    (yargs as any).command([ '$0 <command>' ], 'npmlocal', y => {
        (y as any).command(installCommand('add', 'add local dependencies to package.json'));
        (y as any).command(installCommand('install', 'install local dependencies from package.json'));
        (y as any).command(copyLocalToNpmDepsCommand);
    });


    yargs.version(readPackageJson.sync(findUp.sync('package.json', { cwd: __dirname })).version);

    yargs.middleware(argv => {
        // help is done by yargs by default
        if (argv.h) {
            yargs.showHelp();
            process.exit(1);
        }
    });

    yargs.help().parse();
}
