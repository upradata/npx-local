import { isAbsolute, relative, resolve } from 'path';
import { RelativeAbsolute } from './types';


export const relativeAbsolutPath = (path: string, dir: string = process.cwd()): RelativeAbsolute => {
    return {
        relative: isAbsolute(path) ? relative(dir, path) : path,
        absolute: isAbsolute(path) ? path : resolve(dir, path)
    };
};
