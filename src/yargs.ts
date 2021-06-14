import { findUp, oneLine, ParseArgsFactory, readPackageJson, CommandModule, red } from '@upradata/node-util';
import { LocalInstallOptions } from './local-install.options';
import { LocalInstall } from './local-install';



export function runCommand() {
    const ParseArgs = ParseArgsFactory<LocalInstallOptions>();
    const yargs = new ParseArgs();


    const command = (commandName: 'install' | 'add', describe: string): CommandModule<LocalInstallOptions> => {
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

                y.option('verbose', {
                    type: 'count',
                    default: 0,
                    alias: 'v',
                    describe: 'Enable verbose mode'
                });

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

                y.option('help', {
                    type: 'boolean',
                    default: false,
                    alias: 'h',
                    describe: 'Show this help'
                });

                y.middleware(argv => {
                    // help is done by yargs by default
                    if (argv.h) {
                        yargs.showHelp();
                        process.exit(1);
                    }
                });
            },
            handler: argv => {
                yargs.invalidParamsAndExit(argv);
                install(argv);
            }
        };
    };


    yargs.command([ '$0 <command>' ], 'npmlocal', args => {
        args.command(command('add', 'add local dependencies to package.json'));
        args.command(command('install', 'install local dependencies from package.json'));
    });


    yargs.version(readPackageJson.sync(findUp.sync('package.json', { cwd: __dirname })).version);
    yargs.help().parse();
}


const install = (options: LocalInstallOptions) => {
    new LocalInstall(options).install().then(() => {
        // console.log(green`\n\Local dependencies installed!`);
    }).catch(e => {
        console.error(red`${typeof e === 'string' ? e : `"${e.message}"\n${e.stack}`}`);
    });
};
