import { green } from '../src/util/colors';
import { NpmProject } from '../src/node-project';
import { execAsyncCommand, root, fromRoot } from './util';
import { readJsonSync } from '../src/read-json5';
import path from 'path';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { rm$ } from '../src/util/common';
import { ObjectOf } from '@upradata/util';
import { readdir } from 'fs-extra';


// execSync(`cd ${root} && tsc`);

const localInstall = fromRoot('lib/index.js');
const testProjectsDir = fromRoot('TestProjects');
const project4Dir = path.join(testProjectsDir, 'Project4');


const localDepencies = (packageJson: JSONSchemaForNPMPackageJsonFiles) => packageJson[ NpmProject.localDependenciesFieldName ] as ObjectOf<string>;

describe(
    // tslint:disable-next-line: max-line-length
    'LocalInstall test suite snapshots', () => {

        beforeAll(async () => {
            jest.setTimeout(30000);
            await rm$(path.join(testProjectsDir, 'Project4/node_modules'));
        });


        async function checkInstall() {
            const packageJson = readJsonSync(path.join(testProjectsDir, 'Project4/package.json'));

            const deps = localDepencies(packageJson);
            const depsEntries = Object.entries(deps).map(([ k, v ]) => ({ name: k, path: v }));

            let nodeModulesFiles = await readdir(path.join(project4Dir, 'node_modules'));

            expect(depsEntries.length).toBe(3);

            for (let i = 1; i < 4; ++i) {
                expect(depsEntries.map(d => d.name).includes(`project${i}`)).toBe(true);

                const projectPath = path.join(testProjectsDir, `Project${i}`);
                expect(depsEntries.map(d => d.path).find(p => p.startsWith(`${projectPath}@`))).toBeDefined();

                expect(nodeModulesFiles.includes(`project${i}`));
            }

            nodeModulesFiles = await readdir(path.join(project4Dir, 'node_modules/project1'));
            expect(nodeModulesFiles.length === 2 && nodeModulesFiles.includes('lib') && nodeModulesFiles.includes('package.json')).toBe(true);

            nodeModulesFiles = await readdir(path.join(project4Dir, 'node_modules/project2'));
            expect(nodeModulesFiles.length === 2 && nodeModulesFiles.includes('lib-esm') && nodeModulesFiles.includes('package.json')).toBe(true);

            nodeModulesFiles = await readdir(path.join(project4Dir, 'node_modules/project3'));
            expect(nodeModulesFiles.length === 3 && nodeModulesFiles.includes('lib') && nodeModulesFiles.includes('lib-esm') && nodeModulesFiles.includes('package.json')).toBe(true);


            expect(packageJson).toMatchSnapshot();
        }


        test('Install local pacakges', async () => {
            const packageJson = readJsonSync(path.join(project4Dir, 'package.json'));
            delete packageJson[ NpmProject.localDependenciesFieldName ];

            const command = `${localInstall} --verbose --force ../Project1 ../Project2 ../Project3`;
            console.log(green`Executing: ${command} in ${project4Dir}`);

            await execAsyncCommand(command, { cwd: project4Dir }, false);
            return checkInstall();
        });

        test('Install package.json', async () => {
            const command = `${localInstall}  --verbose  --force`;
            console.log(green`Executing: ${command} in ${project4Dir}`);

            await execAsyncCommand(command, { cwd: project4Dir }, false);
            return checkInstall();
        });
    }
);
