import { InstallMode } from './local-install.options';


export interface DependencyDetail {
    path: string;
    installDir?: string;
    'install-dir'?: string;
}

export type Dependency = DependencyDetail | string;


export class LocalDependency {
    public dependencyDetail: DependencyDetail;
    public version: string;
    public mode: InstallMode;
    public installDir: string;
    public sourcePath: string;

    constructor(dependency: Dependency, options: { version?: string; mode?: InstallMode; } = {}) {
        this.processDependency(dependency, options);
    }

    private processDependency(dependency: Dependency, options: { version?: string; mode?: InstallMode; }) {
        const dep: DependencyDetail = typeof dependency === 'string' ? { path: dependency, installDir: 'node_modules' } : dependency;

        this.dependencyDetail = dep;
        const [ path, depVersion ] = dep.path.split('@');

        let mode: InstallMode;
        let sourcePath: string;

        if (path.split(':').length === 2)
            [ mode, sourcePath ] = path.split(':') as any;
        else
            sourcePath = path;

        this.version = options.version || depVersion;
        this.sourcePath = sourcePath;
        this.mode = options.mode || mode || 'link';
        this.installDir = dep.installDir || dep[ 'install-dir' ];
    }

    public packageJsonPath(): Dependency {
        const path = `${this.mode}:${this.sourcePath}@${this.version}`;

        if (this.installDir === 'node_modules')
            return path;


        return {
            path,
            'install-dir': this.installDir
        };
    }

}
