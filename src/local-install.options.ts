import { AppInjector } from '@upradata/dependency-injection';
import { keys } from '@upradata/util';


export class InstallModes { copy; link; }

export type InstallMode = keyof InstallModes;
export const isInstallMode = (mode: string | undefined | null): mode is InstallMode => {
    return mode && keys(InstallModes).includes(mode as any);
};



export interface LocalPackage {
    path: string;
    mode: InstallMode;
}


export class LocalInstallOptions<LocalDep extends string | LocalPackage = string | LocalPackage> {
    localPackages: LocalDep[] = [];
    projectDir?: string = './'; // which project where we want to install the local packages
    installDir?: string = 'node_modules'; // dir where all the local packages will be copied
    findUp?: boolean = false;
    verbose: number = 0;
    // force: boolean = false;
    mode: InstallMode;
    watch: boolean = false;
}



export const getOption = () => AppInjector.root.get(LocalInstallOptions);
