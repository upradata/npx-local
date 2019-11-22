export type InstallMode = 'copy' | 'link';

export class LocalInstallOptions {
    localPackages: string[] = [];
    installDir?: string = './';
    verbose: number = 0;
    force: boolean = false;
    mode: InstallMode;
    watch: boolean = false;
}
