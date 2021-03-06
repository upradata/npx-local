import { green } from '../src/util/colors';
import { projectDir, localInstall, readProjectInInstallDir, testProjectsDir, execAsyncCommand } from './util';
import { readJsonAsync } from '../src/read-json5';
import path from 'path';
import { readdir } from 'fs-extra';
import { LocalInstallPackageJsonType } from '../src/package-json';
import { ObjectOf } from '@upradata/util';
import { DependencyDetail } from '../src/local-dependency';


export interface Dependency {
    projectI: number;
    files: string[];
}

export function execNpmLocal(projectI: number, deps: number[] = [], installDir?: string) {
    const packageJson = readJsonAsync(path.join(projectDir(projectI), 'package.json')) as LocalInstallPackageJsonType;
    delete packageJson.local;

    const installDirOption = installDir ? `--install-dir ${installDir}` : '';

    const localDeps = deps.map((i, j) => `../Project${i}${(j === 0) ? ':copy' : ''}`).join(' ');
    const command = `${localInstall} ${installDirOption} --verbose --force ${localDeps}`;

    console.log(green`Executing: ${command} in ${projectDir(projectI)}`);
    return execAsyncCommand(command, { cwd: projectDir(projectI) });
}



export async function checkInstallDir(projectI: number, deps: Dependency[], installDir: string = 'node_modules') {
    const installDirFiles = await readdir(path.join(projectDir(projectI), installDir));

    for (let i = 0; i < 4; ++i) {
        if (i !== projectI)
            expect(installDirFiles.includes(`project${i}`));
    }

    await Promise.all(deps.map(async dep => {
        const nodeModulesFiles = await readdir(path.join(projectDir(projectI), installDir, `project${dep.projectI}`));
        expect(nodeModulesFiles.length === dep.files.length).toBe(true);
        for (const file of dep.files)
            expect(nodeModulesFiles.includes(file)).toBe(true);
    }));
}


export function checkLocalProp(localProp: ObjectOf<string | DependencyDetail>, deps: number[]) {

    expect(localProp).toBeDefined();

    if (!localProp)
        return;

    const packages = Object.entries(localProp).map(([ k, v ]) => ({ name: k, dependency: v }));

    expect(packages.length).toBe(deps.length);

    for (const depI of deps) {
        expect(packages.map(d => d.name).includes(`project${depI}`)).toBe(true);

        const projectPath = path.join(testProjectsDir, `Project${depI}`);
        expect(packages.map(d => d.dependency).find(dep => {
            let path = typeof dep === 'string' ? dep : dep.path;
            if (path.split(':').length === 2)
                path = path.split(':')[ 1 ];

            return path.startsWith(`${projectPath}`);
        })).toBeDefined();
    }
}
