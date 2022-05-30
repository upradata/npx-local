import { findUp, oneLine, createCli, CliCommand, parsers as cliParsers, CliOptionInit } from '@upradata/node-util';
import { dependenciesDef } from './cli.common';
import { LocalInstallOptions } from './local-install.options';
import { LocalInstall } from './local-install';
import { mergeInto } from './merge-to-branch';
import { DependencyType } from './types';


const installCommand = (commandName: 'install' | 'add', description: string): CliCommand => {
    const command = createCli();

    command.name(commandName);

    if (commandName === 'add')
        command.argument('<local-packages...>', 'local packages to install');

    command.description(description);


    if (commandName === 'add') {
        command.option('-l, --local-packages <packages...>', 'local packages to install');

        const depTypeOptions: CliOptionInit<DependencyType> = {
            flags: '--dependency-type',
            parser: cliParsers.choices(dependenciesDef.map(d => d.depType))
        };

        command.option(depTypeOptions);

        for (const { flags, depName, depType } of dependenciesDef) {
            command.option({
                flags: `${flags} [bool]`, description: `add the local dependency in ${depName}`, parser: cliParsers.boolean,
                aliases: [ {
                    ...depTypeOptions, mode: 'target', transform: (v: string) => v === null || v === 'true' ? depType : undefined
                } ]
            });

        }
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
        console.log(options);
        const localPackages = (options.localPackages || []).concat(commandArguments);
        return new LocalInstall({ ...options, localPackages }).install();
    });

    return command;
};


const copyLocalToNpmDepsCommand = (): CliCommand => {
    const command = createCli();

    command.name('local-to-npm').alias('transfer');
    command.description('copy all local dependencies to npm dependencies [package.json].dependencies/devDependencies');

    command.action(() => new LocalInstall().copyLocalDepsToNpmProperty());

    return command;
};


const mergeIntoBranch = (): CliCommand => {
    const command = createCli();

    command.name('merge-into').alias('merge');
    command.description('merge current branch to specified branch');

    command.option('-b, --branch', 'branch name where to merge', 'master');
    command.option('--no-patch', 'patch version before merging');
    command.option('--no-publish', 'publish to npm registry');

    command.action((options: { branch: string; patch: boolean; publish: boolean; }) => {
        return mergeInto(options.branch, { bumpVersion: options.patch, npmPublish: options.publish });
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
    cli.addCommand(mergeIntoBranch());

    cli.parse();
}
