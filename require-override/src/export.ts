import Module from 'module';
import { getFullPathNormalized } from './full-path';
import { isString, ReRequireObject, ReRequireModuleAcceptFunction, ReRequireModuleAccept, ModuleExports, ensureArray } from './types';


export class ExportContext {
    constructor(public fromModule: string, public _export: Export) { }

    fullPath(filePath: string) {
        return getFullPathNormalized(filePath, this.fromModule);
    }

    add(requireObj: ReRequireObject<ReRequireModuleAccept>) {
        const { module } = requireObj;

        if (isString(module)) {
            this._export.exports[ this.fullPath(module) ] = requireObj as ReRequireObject<string>;
        } else {
            this._export.accepts.push(requireObj as ReRequireObject<ReRequireModuleAcceptFunction>);
        }
    }

    has(filePath: string) {
        return this._export.exports.hasOwnProperty(this.fullPath(filePath));
    }

    get(filePath: string) {
        return this._export.exports[ this.fullPath(filePath) ];
    }

    require(filePath: string, parent: Module): ModuleExports {
        let fileExport: ReRequireObject<ReRequireModuleAccept> = this._export.exports[ this.fullPath(filePath) ];

        if (!fileExport) {
            for (const accept of this._export.accepts) {
                if (accept.module(filePath, parent)) {
                    fileExport = accept;
                    break;
                }
            }
        }

        if (!fileExport)
            return undefined;

        const { exports, newModule } = fileExport;

        if (typeof exports !== 'undefined')
            return exports;

        let newPaths: string[] = undefined;

        if (typeof newModule === 'function')
            newPaths = ensureArray(newModule(filePath, parent));
        else
            newPaths = ensureArray(newModule);

        newPaths = newPaths.filter(path => !!path).map(path => this.fullPath(path));

        for (const newPath of newPaths) {
            try {
                return require(newPath);
            } catch (e) {
                1 === 1;
            }
        }

        return undefined;
        // throw new Error(`Overrided require could not find module ${filePath}`);
    }

    delete(filePath: string) {
        delete this._export.exports[ this.fullPath(filePath) ];
    }
}


export type Exports = { [ path: string ]: ReRequireObject<string>; };

export class Export {
    exports: Exports;
    accepts: ReRequireObject<ReRequireModuleAcceptFunction>[];

    constructor() {
        this.init();
    }

    fromModule(from: string) {
        return new ExportContext(from, this);
    }

    init() {
        this.exports = {};
        this.accepts = [];
    }
}
