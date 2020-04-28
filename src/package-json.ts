import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import { ObjectOf } from '@upradata/util';
import { pathExists } from 'fs-extra';
import findUp from 'find-up';
import { Dependency } from './local-dependency';
import { readPackageJson } from '@upradata/node-util';

export class Local {
    dependencies?: ObjectOf<Dependency>;
    usedBy?: ObjectOf<string>;
}

export type LocalInstallPackageJsonType = JSONSchemaForNPMPackageJsonFiles & { local?: Local; };

export class SyncAsync<T = any> {
    sync: T = undefined;
    async: Promise<T> = undefined;
}

const syncAsync = Object.keys(new SyncAsync());

export class LocalInstallPackageJson {
    public json: LocalInstallPackageJsonType;
    public _path: string;


    constructor(public directory: string) { }

    public async load() {
        if (await this.hasPackageJson())
            return this.readJson();

        throw new Error(`The directory "${this.directory}" does not have a package.json`);
    }


    public getPath(mode: keyof SyncAsync) {
        const findUpArgs = [ 'package.json', { cwd: this.directory } ];

        const path = () => {
            return mode === 'sync' ? findUp.sync.apply(null, findUpArgs) : findUp.apply(null, findUpArgs);
        };

        return mode === 'sync' ?
            this._path ? this._path : this._path = path() :
            this._path ? Promise.resolve(this._path) : path().then(p => { this._path = p; return p; });

    }

    public get path(): SyncAsync<string> {
        const o = {};

        for (const mode of syncAsync) {
            Object.defineProperty(o, mode, {
                get: () => {
                    return this.getPath(mode as any);
                }
            });
        }

        return o as any;
    }

    public async hasPackageJson() {
        return pathExists(await this.path.async);
    }

    async readJson(force: boolean = false) {
        if (!this.json || force) {
            const json = await readPackageJson.async(await this.path.async);
            this.json = json as LocalInstallPackageJson;
        }

        return this.json;
    }

    public getLocal(mode: keyof SyncAsync): Local | Promise<Local> {
        const local = (json: LocalInstallPackageJsonType) => {
            json.local = json.local || {};
            return json.local;
        };

        return mode === 'sync' ? local(this.json) : this.readJson().then(local);
    }



    public getLocalProp(prop: keyof Local, mode: keyof SyncAsync) {
        const localProp = (local: Local, prop: keyof Local) => {
            local[ prop ] = local[ prop ] || {} as any;
            return local[ prop ];
        };

        return mode === 'sync' ?
            localProp(this.getLocal(mode) as Local, prop) :
            (this.getLocal(mode) as Promise<Local>).then(local => localProp(local, prop));
    }

    public get local(): SyncAsync<Local> {
        const o = {};

        for (const mode of syncAsync) {
            Object.defineProperty(o, mode, {
                get: () => {
                    return this.getLocal(mode as any);
                }
            });
        }

        return o as any;
    }

    public localProp(prop: keyof Local): SyncAsync<string> {
        const o = {};

        for (const mode of syncAsync) {
            Object.defineProperty(o, mode, {
                get: () => {
                    return this.getLocalProp(prop, mode as any);
                }
            });
        }

        return o as any;
    }

}
