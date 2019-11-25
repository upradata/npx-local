export class InstallModes {
    copy = undefined;
    link = undefined;
}

export type InstallMode = keyof InstallModes;
export const isInstallMode = (mode: string): mode is InstallMode => Object.keys(new InstallModes()).includes(mode);


export interface LocalPackage {
    path: string;
    mode: InstallMode;
}

export class LocalInstallOptions<LocalDep extends string | LocalPackage> {
    localPackages: LocalDep[] = [];
    projectDir?: string = './';
    installDir?: string = 'node_modules';
    verbose: number = 0;
    force: boolean = false;
    mode: InstallMode;
    watch: boolean = false;
}
