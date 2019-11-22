import { projectDir } from './util';
import { readJsonAsync } from '../src/read-json5';
import path from 'path';
import { LocalInstallPackageJsonType } from '../src/package-json';
import { chain } from '@upradata/util';
import { execNpmLocal, checkNodeModules, Dependency, checkLocalProp } from './common';
import { projects } from './projects.config';
import { remove } from 'fs-extra';


// execSync(`cd ${root} && tsc`);

async function checkLocalDependencies(projectI: number, deps: Dependency[]) {
    const packageJson = await readJsonAsync(path.join(projectDir(projectI), 'package.json')) as LocalInstallPackageJsonType;
    // console.log({ projectI, deps });
    checkLocalProp(chain(() => packageJson.local.dependencies), deps.map(dep => dep.projectI));
    await checkNodeModules(projectI, deps);
}


async function checkLocalUsedBy(projectI: number, usedBys: number[]) {
    const packageJson = await readJsonAsync(path.join(projectDir(projectI), 'package.json')) as LocalInstallPackageJsonType;
    checkLocalProp(chain(() => packageJson.local.usedBy), usedBys);
}

async function snapshot(projectI: number) {
    const packageJson = await readJsonAsync(path.join(projectDir(projectI), 'package.json')) as LocalInstallPackageJsonType;
    expect(packageJson).toMatchSnapshot();
}


describe('Test => npmlocal --verbose --force [...local-projects]', () => {

    beforeAll(async () => {
        jest.setTimeout(30000);
        await Promise.all([ 1, 2, 3, 4 ].map(i => remove(path.join(projectDir(i), 'node_modules')).catch(console.warn)));
        await execNpmLocal(1, [ 2, 3, 4 ]);
        await execNpmLocal(4, [ 1, 2, 3 ]);
    });

    test('is localDependencies set', async () => {
        await Promise.all([
            checkLocalDependencies(projects.project1.projectI, projects.project1.localDeps),
            checkLocalDependencies(projects.project4.projectI, projects.project4.localDeps)
        ]);
    });


    test('is usedBy set', async () => {
        await Promise.all([
            checkLocalUsedBy(projects.project1.projectI, projects.project1.usedBys),
            checkLocalUsedBy(projects.project2.projectI, projects.project2.usedBys),
            checkLocalUsedBy(projects.project3.projectI, projects.project3.usedBys),
            checkLocalUsedBy(projects.project4.projectI, projects.project4.usedBys),
        ]);
    });

    test('is package.json same snapshot', async () => {
        await Promise.all(Object.values(projects).map((p, i) => snapshot(i + 1)));
    });
}
);

describe('Test => npmlocal in current npm package', () => {

    beforeAll(async () => {
        jest.setTimeout(30000);
        await remove(path.join(projectDir(4), 'node_modules')).catch(console.warn);
        await execNpmLocal(4);
    });

    test('Install package.json', async () => {
        await checkLocalDependencies(projects.project4.projectI, projects.project4.localDeps);
    });
}
);
