import shell from 'shelljs';
import live from 'shelljs-live';
import { styles as s } from '@upradata/node-util';
import { LocalInstall } from './local-install';


type LogOptions = { newLine?: boolean; };

const log = (str: string, what: 'log' | 'warn' | 'error', options: LogOptions = {}) => {
    const { newLine = true } = options;
    console[ what ](`${newLine ? '\n' : ''}${str}`);
};

const inform = (str: string, options?: LogOptions) => log(s.magenta.bold.$`⦿ ${str} ⦿`, 'log', options);

const error = (str: string, options?: LogOptions) => log(s.red.bold.$`❌ ${str} ❌`, 'error', options);


export const isGitInstalled = () => shell.which('git');

export const ensureGitInstalled = () => {
    if (!isGitInstalled()) {
        error('Sorry, this script requires git');
        shell.exit(1);
    }
};


export const mergeInto = async (branchName: string = 'master', options: { bumpVersion?: boolean; npmPublish?: boolean; } = {}) => {
    ensureGitInstalled();

    const currentBranch = shell.exec('git branch --show-current', { silent: true }).stdout.trim();

    if (options.bumpVersion) {
        inform('Bump version: patch');
        live('npm version patch');
    }

    inform(`Moving to ${branchName}`);
    live(`git checkout ${branchName}`);

    inform(`Git merge: ${currentBranch} ⟶ ${branchName}`);
    live(`git merge ${currentBranch}`);
    live('git checkout --theirs .');

    inform(`Execute npx-local local-to-npm`);
    await new LocalInstall({ quiet: true }).copyLocalDepsToNpmProperty();

    inform('Commit merge + Git push (commits and tags)');

    live('git add .');
    live(`git commit -m "merge ${currentBranch}"`);
    live('git pushall && git pushall-tags');

    if (options.npmPublish) {
        inform('Publish to NPM registry');
        live('npm publish --access public');
    }

    inform(`Moving to ${currentBranch}`);
    live(`git checkout ${currentBranch}`);
};
