import JSON5 from 'json5';
import { readFileSync, readFile } from 'fs-extra';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';


export function readJson(filename: string, mode: 'sync' | 'async'): Promise<JSONSchemaForNPMPackageJsonFiles> | JSONSchemaForNPMPackageJsonFiles {

    const normalizeData = data => data === '' ? {} : JSON5.parse(data);

    if (mode === 'sync') {
        const data = readFileSync(filename, 'utf8');
        return normalizeData(data);
    }

    return readFile(filename, 'utf8').then(normalizeData);
}

export function readJsonSync(filename: string): JSONSchemaForNPMPackageJsonFiles {
    return readJson(filename, 'sync') as JSONSchemaForNPMPackageJsonFiles;
}

export function readJsonASync(filename: string): Promise<JSONSchemaForNPMPackageJsonFiles> {
    return readJson(filename, 'async') as Promise<JSONSchemaForNPMPackageJsonFiles>;
}

/* export async function readJson(directory: string, filename: string): Promise<JSONSchemaForNPMPackageJsonFiles> {
    const file = path.join(directory, filename);

    try {
        if (!await pathExists(file)) {
            const msg = `${file} doesn't exist`;
            console.error(red`${msg}`);
            throw new Error(msg);
        }

        const data = await readFile$(file, 'utf8');
        return data === '' ? {} : JSON5.parse(data);
    } catch (e) {
        throw e;
    }
}
 */
