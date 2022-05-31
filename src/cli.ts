import {
    CliCommand,
    CliOptionInit,
    createCli,
    findUp,
    oneLine,
    parsers as cliParsers
} from '@upradata/node-util';
import { LocalInstall } from './local-install';
import { LocalInstallOptions } from './local-install.options';
import { mergeInto } from './merge-to-branch';
import { DependencyType, SemVersionType } from './types';
import { dependenciesDef, semVerDefinitions } from './util';


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
            description: `add the local dependency in one of [ ${dependenciesDef.map(d => d.depType).join(', ')} ]`,
            parser: cliParsers.choices(dependenciesDef.map(d => d.depType))
        };

        command.option({ ...depTypeOptions, defaultValue: 'prod' as DependencyType });

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


const mergeIntoBranchCommand = (): CliCommand => {
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


const bumpVersionCommand = (): CliCommand => {
    const command = createCli();

    command.name('bump-version');
    command.description('Bump SemVer package version');

    const semVerTypeOption: CliOptionInit<SemVersionType> = {
        flags: '-t, --type [semver type]',
        description: 'SemVer part to bump',
        parser: cliParsers.choices(semVerDefinitions.map(d => d.name))
    };

    command.option({ ...semVerTypeOption, defaultValue: 'patch' as SemVersionType });

    for (const { name, flags } of semVerDefinitions) {
        command.option({
            flags: `${flags} [bool]`, description: `bump SemVer ${name} part`, parser: cliParsers.boolean,
            aliases: [ {
                ...semVerTypeOption, mode: 'target', transform: (v: string) => v === null || v === 'true' ? name : undefined
            } ]
        });
    }

    command.option('-v, --version', 'specify exatcly the version');

    command.action((options: { type: SemVersionType; version: string; }) => new LocalInstall().bumpVersion({ ...options, semVer: options.type }));

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
    cli.addCommand(mergeIntoBranchCommand());
    cli.addCommand(bumpVersionCommand());

    cli.parse();
}
