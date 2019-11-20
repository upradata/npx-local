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

export const terminalWidth = process.stdout.columns - 1 || 80;

export function stringAlignCenter(s: string, size: number = terminalWidth): string {

    const trim = s.trim();
    const whitespaceWidth = size - trim.length;

    if (whitespaceWidth <= 0)
        return s;

    const beginL = Math.floor(whitespaceWidth / 2) - 1; // -1 je ne sais pas pk :)
    const endL = whitespaceWidth - beginL;


    return ' '.repeat(beginL) + trim + ' '.repeat(endL);
}
