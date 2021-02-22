import {
    ReRequireExports as ReRequireExports,
    ReRequireOptions,
    ReRequireModuleAccept as ReRequireModuleAccept,
    ReRequireModuleAcceptFunction,
    ReRequireObject as ReRequireObject
} from './types';
import Module from 'module';
import getCallerFile from 'get-caller-file';
import { Export } from './export';


const originalLoader = Module._load;

export class RequireOverride {
    pendingExports = new Export();
    exports = new Export();

    constructor() {
        this.init();
        this.addModuleLoad();
    }

    private init() {
        this.exports.init();
        this.pendingExports.init();
        this.exports.callbacks = this.pendingExports.callbacks;
    }

    private addModuleLoad() {
        const _this = this;

        Module._load = function (request: string, parent: Module) {
            // parent === null =>  current module is the entry point of the current process
            // parent === undefined =>  if the module was loaded by something that is not a CommonJS module (E.G.: REPL or import)
            if (!parent) return originalLoader.apply(this, arguments);

            const moduleFrom = parent.filename;

            const pendingExports = _this.pendingExports.fromModule(moduleFrom);
            const exports = _this.exports.fromModule(moduleFrom);

            if (pendingExports.has(request)) {
                exports.add(pendingExports.get(request));
                pendingExports.delete(request);
            }

            return exports.require(request, parent) || originalLoader.apply(this, arguments);
        };
    }


    start(path: ReRequireModuleAccept, exports: ReRequireExports): void;
    start<M extends ReRequireModuleAccept>(options: ReRequireObject<M>): void;
    start<M extends ReRequireModuleAccept>(pathOrOptions: ReRequireModuleAccept | ReRequireObject<M>, exports?: ReRequireExports): void {
        let opts: ReRequireObject<ReRequireModuleAccept> = undefined;

        if (arguments.length === 2) {
            opts = {
                module: pathOrOptions as ReRequireModuleAccept,
                exports,
                newModule: undefined
            };
        } else {
            opts = { ...(pathOrOptions as ReRequireObject<M>) };
        }

        this.pendingExports.fromModule(getCallerFile()).add(opts);
    }

    stop(path: string) {
        const calledFrom = getCallerFile();
        this.pendingExports.fromModule(calledFrom).delete(path);
        this.exports.fromModule(calledFrom).delete(path);
    }

    stopAll() {
        this.init();
    }

    reRequire(path: string) {
        const module = this.exports.fromModule(getCallerFile()).fullPath(path);
        delete require.cache[ require.resolve(module) ];
        return require(module);
    }
}


export const requireOverride = new RequireOverride();
