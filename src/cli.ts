import { findUp, oneLine, readPackageJson, createCli, CliCommand, parsers as cliParsers } from '@upradata/node-util';
import { LocalInstallOptions } from './local-install.options';
import { LocalInstall } from './local-install';


const installCommand = (commandName: 'install' | 'add', description: string): CliCommand => {
    const command = createCli();

    command.name(commandName === 'add' ? 'add' : commandName);

    if (commandName === 'add')
        command.argument('<local-packages...>', 'local packages to install');

    command.description(description);



    if (commandName === 'add') {
        command.option('-l, --local-packages <packages...>', 'local packages to install');
    }

    command.option('-p, --project-dir <path>', 'directory of project where to install local dependencies', './');

    command.option('-i, --install-dir <path>', 'directory where to install local packages (node_modules per default', 'node_modules');

    command.option('-m, --mode', 'choose if the local dependency files are copied or linked in node_modules', 'link');

    /* command.option('-f, --force', 'Force package installation'); */


    command.option('--find-up', oneLine`enable find-up algorithm to find a package.json directory for both the project
                     where to install the dependencies and the folder where there is the local dependency`);

    command.option('-w, --watch', 'enable watch mode');

    command.action((...args: any[]) => {
        const options: LocalInstallOptions = commandName === 'install' ? args[ 0 ] : args[ 1 ];
        const commandArguments: string[] = commandName === 'install' ? [] : args[ 0 ];

        const localPackages = (options.localPackages || []).concat(commandArguments);
        return new LocalInstall({ ...options, localPackages }).install();
    });

    return command;
};


const copyLocalToNpmDepsCommand = (): CliCommand => {
    const command = createCli();

    command.name('local-to-npm');
    command.description('copy all local dependencies to npm dependencies [package.json].dependencies/devDependencies');


    command.option('-P, --prod', 'add the local dependency in [package.json].dependencies', true);
    command.option('-D, --dev', 'add the local dependency in [package.json].devDependencies');


    command.action((options: { dev: boolean; prod: boolean; }) => {
        new LocalInstall({
            npmPropertyToCopyLocalDeps: options.dev ? 'devDependencies' : 'dependencies',
        }).copyLocalDepsToNpmProperty();
    });


    return command;
};



export function runCli() {
    const cli = createCli({ packageJson: findUp.sync('package.json', { from: __dirname }) });
    cli.description('cli to install local projects to node_modules');

    cli.option('-v, --verbose', 'enable verbose mode', cliParsers.increaseNumber(0));
    cli.option('-q, --quiet', 'enable quiet mode');

    cli.addCommand(installCommand('add', 'add local dependencies to package.json'));
    cli.addCommand(installCommand('install', 'install local dependencies from package.json'));
    cli.addCommand(copyLocalToNpmDepsCommand());

    cli.parse();
}
