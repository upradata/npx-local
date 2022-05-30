import shell from 'shelljs';
import { LocalInstall } from './local-install';

export const isGitInstalled = () => shell.which('git');

export const ensureGitInstalled = () => {
    if (!isGitInstalled()) {
        shell.echo('Sorry, this script requires git');
        shell.exit(1);
    }
};

export const mergeInto = (branchName: string = 'master', options: { bumpVersion?: boolean; npmPublish?: boolean; } = {}) => {
    ensureGitInstalled();

    const currentBranch = shell.exec('git branch --show-current', { silent: true }).stdout.trim();

    if (options.bumpVersion) {
        shell.echo('Bump version: patch');
        shell.exec('npm version patch');
    }

    shell.exec(`git checkout ${branchName}`);
    shell.exec(`git merge ${currentBranch}`);
    shell.exec('git checkout --theirs .');

    new LocalInstall().copyLocalDepsToNpmProperty();

    shell.exec('git add .');
    shell.exec(`git commit -m "merge ${currentBranch}"`);
    shell.exec('git pushall && git pushall-tags');

    if (options.npmPublish)
        shell.exec('npm publish --access public');

    shell.exec(`git checkout ${currentBranch}`);
};
