import { DependencyName, DependencyType } from './types';

export const dependenciesDef = [
    { depType: 'prod' as DependencyType, flags: '-P, --prod', depName: 'dependencies' as DependencyName },
    { depType: 'dev' as DependencyType, flags: '-D, --dev', depName: 'devDependencies' as DependencyName },
    { depType: 'peers' as DependencyType, flags: '--peers', depName: 'peersDependencies' as DependencyName }
] as const;


export const getDependencyName = (dependencyType: DependencyType) => dependenciesDef.find(d => d.depType === dependencyType)?.depName;
