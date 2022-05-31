import { isAbsolute, relative, resolve } from 'path';
import { DependencyName, DependencyType, RelativeAbsolute, SemVersionType } from './types';


const dependencyDef = <D extends { depType: DependencyType; flags: string; depName: DependencyName; }>(def: D) => def;

export const dependenciesDef = [
    dependencyDef({ depType: 'prod', flags: '-P, --prod', depName: 'dependencies' } as const),
    dependencyDef({ depType: 'dev', flags: '-D, --dev', depName: 'devDependencies' } as const),
    dependencyDef({ depType: 'peers', flags: '--peers', depName: 'peersDependencies' } as const),
] as const;

export const getDependencyName = (dependencyType: DependencyType) => dependenciesDef.find(d => d.depType === dependencyType)?.depName;



const semVerDefinition = <D extends { name: SemVersionType; flags: string; }>(def: D) => def;

export const semVerDefinitions = [
    semVerDefinition({ name: 'major', flags: '-M, --major' } as const),
    semVerDefinition({ name: 'minor', flags: '-m, --minor' } as const),
    semVerDefinition({ name: 'major', flags: '-p, --patch', } as const),
] as const;



export const relativeAbsolutPath = (path: string, dir: string = process.cwd()): RelativeAbsolute => {
    return {
        relative: isAbsolute(path) ? relative(dir, path) : path,
        absolute: isAbsolute(path) ? path : resolve(dir, path)
    };
};
