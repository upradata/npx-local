import { promisify } from 'util';
import { exec, ExecOptions } from 'child_process';
import { readFile } from 'fs';
import path from 'path';


const execAsync = promisify(exec);

export const readFileAsync = promisify(readFile);

export async function execAsyncCommand(command: string, options?: { encoding?: BufferEncoding; } & ExecOptions, verbose: boolean = false) {
    const { stdout, stderr } = await execAsync(command, options);

    if (verbose) {
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    }
}


export const root = path.join(__dirname, '..');
export const fromRoot = (...paths: string[]) => path.join(root, ...paths);
