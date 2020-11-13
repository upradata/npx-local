import Module from 'module';

export type ModuleExports = number | string | boolean | Function | symbol | object;


declare module 'module' {
    export function _load(path: string, module: ThisType<Module>): ModuleExports;
    export function _resolveFilename(id: string): string;
    export const globalPaths: string[];
}

export type RequireExports = ModuleExports;

export type RequireModuleAcceptFunction = (request: string, parent: Module) => boolean;
export type RequireModuleAccept = string | RequireModuleAcceptFunction;

export type RequireNewModule = string | string[];
export type RequireNewModuleFunction = (request: string, parent: Module) => RequireNewModule;


export interface RequireObject<M extends RequireModuleAccept> {
    module: M;
    exports: RequireExports;
    newModule: RequireNewModuleFunction | RequireNewModule;
}

export type RequireOptions<M extends RequireModuleAccept> = RequireObject<M> | RequireExports;


export const isString = (s: any): s is string => typeof s === 'string';
export const ensureArray = <T>(a: T | T[]): T[] => Array.isArray(a) ? a : [ a ];
