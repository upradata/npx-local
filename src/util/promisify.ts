import fs from 'fs';
import { promisify } from 'util';
import rimraf from 'rimraf';

export const symlink$ = promisify(fs.symlink);
export const mkdir$ = promisify(fs.mkdir);
export const lstat$ = promisify(fs.lstat);
export const readlink$ = promisify(fs.readlink);
export const readFile$ = promisify(fs.readFile);
export const readdir$ = promisify(fs.readdir);
export const rm$ = promisify(rimraf);
