import { InstallMode } from './local-install.options';


export interface DependencyDetail {
    path: string;
    installDir?: string; // where to install (default node_modules)
}


export type Dependency = DependencyDetail | string;


export interface LocalDependencyOptions {
    version?: string;
    mode?: InstallMode;
}



export class LocalDependency {
    public dependencyDetail: DependencyDetail;
    public version: string;
    public mode: InstallMode;
    public installDir: string;
    public sourcePath: string;

    constructor(dependency: Dependency, options?: LocalDependencyOptions) {
        this.parseDependency(dependency, options);
    }

    private parseDependency(dependency: Dependency, options: LocalDependencyOptions = {}) {
        const dep: DependencyDetail = typeof dependency === 'string' ? { path: dependency, installDir: 'node_modules' } : dependency;

        this.dependencyDetail = dep;
        const [ path, depVersion ] = dep.path.split('@');

        const split = () => {
            if (path.split(':').length === 2) {
                const [ mode, sourcePath ] = path.split(':') as [ InstallMode, string ];
                return { mode, sourcePath };
            }

            return { mode: undefined, sourcePath: path };
        };

        const { mode, sourcePath } = split();

        this.version = options.version || depVersion;
        this.sourcePath = sourcePath;
        this.mode = options.mode || mode || 'link';
        this.installDir = dep.installDir;
    }

    public unparse(): Dependency {
        const path = `${this.mode}:${this.sourcePath}@${this.version}`;

        if (this.installDir === 'node_modules')
            return path;


        return {
            path,
            installDir: this.installDir
        };
    }

}
