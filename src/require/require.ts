import { RequireExports, RequireOptions, RequireModuleAccept, RequireModuleAcceptFunction, RequireObject, isString } from './types';
import Module from 'module';
import getCallerFile from 'get-caller-file';
import { Export } from './export';


const originalLoader = Module._load;

export class Require {
    pendingExports = new Export();
    exports = new Export();

    constructor() {
        this.init();
        this.addModuleLoad();
    }

    private init() {
        this.exports.init();
        this.pendingExports.init();
        this.exports.accepts = this.pendingExports.accepts;
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


    start(path: RequireModuleAccept, exports: RequireExports): void;
    start<M extends RequireModuleAccept>(options: RequireOptions<M>): void;
    start(pathOrOptions: any, exports?: RequireExports): void {
        let opts: RequireObject<RequireModuleAccept> = undefined;

        if (arguments.length === 2) {
            opts = {
                module: pathOrOptions,
                exports,
                newModule: undefined
            };
        } else {
            opts = { ...pathOrOptions };
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


export const requireOverride = new Require();
