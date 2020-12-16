import Module from 'module';

export type ModuleExports = number | string | boolean | Function | symbol | object;


declare module 'module' {
    export function _load(path: string, module: ThisType<Module>): ModuleExports;
    export function _resolveFilename(id: string): string;
    export const globalPaths: string[];
}

export type ReRequireExports = ModuleExports;

export type ReRequireModuleAcceptFunction = (request: string, parent: Module) => boolean;
export type ReRequireModuleAccept = string | ReRequireModuleAcceptFunction;

export type ReRequireNewModule = string | string[];
export type ReRequireNewModuleFunction = (request: string, parent: Module) => ReRequireNewModule;


export interface ReRequireObject<M extends ReRequireModuleAccept> {
    module: M;
    exports: ReRequireExports;
    newModule: ReRequireNewModuleFunction | ReRequireNewModule;
}

export type ReRequireOptions<M extends ReRequireModuleAccept> = ReRequireObject<M> | ReRequireExports;


export const isString = (s: any): s is string => typeof s === 'string';
export const ensureArray = <T>(a: T | T[]): T[] => Array.isArray(a) ? a : [ a ];
