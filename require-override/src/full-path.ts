import normalize from 'normalize-path';
import { dirname, join, resolve, sep as pathsep } from 'path';
import Module from 'module';

export function getFullPathNormalized(path: string, calledFrom: string) {
    return normalize(getFullPath(path, calledFrom));
}

export function getFullPath(path: string, calledFrom: string) {
    let resolvedPath: string;

    try {
        resolvedPath = require.resolve(path);
    } catch (e) {
        // do nothing
        // it can be a symlink project module
        resolvedPath = path;
    }

    const isLocalModule = /^\.{1,2}[/\\]?/.test(path);
    const isInPath = isInNodePath(resolvedPath);
    const isExternal = !isLocalModule && /[/\\]node_modules[/\\]/.test(resolvedPath);
    const isSystemModuleOrSymlinkedProjectModule = resolvedPath === path;

    if (isExternal || isSystemModuleOrSymlinkedProjectModule || isInPath) {
        return resolvedPath;
    }

    if (!isLocalModule) {
        return path;
    }

    const localModuleName = join(dirname(calledFrom), path);

    try {
        return Module._resolveFilename(localModuleName);
    } catch (e) {
        if (isModuleNotFoundError(e))
            return localModuleName;

        throw e;
    }
}


function isInNodePath(resolvedPath: string) {
    if (!resolvedPath) return false;

    return Module.globalPaths
        .map(nodePath => resolve(process.cwd(), nodePath) + pathsep)
        .some(fullNodePath => resolvedPath.indexOf(fullNodePath) === 0);
}


function isModuleNotFoundError(e: { code?: string; }) {
    return e.code && e.code === 'MODULE_NOT_FOUND';
}
