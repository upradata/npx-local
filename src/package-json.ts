import { join } from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';
import {
    fileExists,
    findUp,
    readPackageJson,
    SyncAsync,
    SyncAsyncMode,
    SyncAsyncType
} from '@upradata/node-util';
import { CodifiedError, ObjectOf, ValueOf } from '@upradata/util';
import { Dependency } from './local-dependency';
import { getOptions } from './local-install.options';
import { Errors } from './types';


export class Local {
    dependencies?: ObjectOf<Dependency>;
    usedBy?: ObjectOf<string>;
}


export type LocalInstallPackageJsonType = JSONSchemaForNPMPackageJsonFiles & { local?: Local; };


export class LocalInstallPackageJson {
    public json: LocalInstallPackageJsonType;
    public _path: string;


    constructor(public directory: string) { }

    public async load() {
        return this.readJson();
    }


    private getPackageJsonPath<M extends SyncAsyncMode>(mode: M) {

        const path = <Mode extends SyncAsyncMode>(m: Mode): SyncAsyncType<Mode, string> => {
            const pkgJsonFile = 'package.json';

            if (getOptions().findUp)
                return findUp[ m ](pkgJsonFile, { type: 'file', cwd: this.directory }) as any;

            const pkgJsonPath = join(this.directory, pkgJsonFile);

            return (m === 'sync' ? pkgJsonPath : Promise.resolve(pkgJsonPath)) as any;
        };

        const set = (p: string) => { this._path = p; return p; };

        const r = mode === 'sync' ?
            this._path ? this._path : set(path('sync')) :
            this._path ? Promise.resolve(this._path) : path('async').then(set);

        return r as SyncAsyncType<M, string>;
    }

    public get path(): SyncAsync<string> {
        const _this = this;

        return {
            get sync() { return _this.getPackageJsonPath('sync'); },
            get async() { return _this.getPackageJsonPath('async'); }
        };
    }


    async readJson(force: boolean = false) {
        if (!this.json || force) {
            const path = await this.path.async;

            if (await fileExists.async(path)) {

                const json = await readPackageJson.async(await this.path.async);
                this.json = json as LocalInstallPackageJson;

            } else {

                throw new CodifiedError<Errors>({
                    message: `The directory "${this.directory}" does not have a "package.json"`,
                    code: Errors.NO_PACKAGE_JSON
                });
            }
        }

        return this.json;
    }

    private getProp = <O, P extends keyof O>(o: O, prop: P): O[ P ] => {
        o[ prop ] = o[ prop ] || {} as any;
        return o[ prop ];
    };

    private getLocal<M extends SyncAsyncMode>(mode: M) {
        const get = (json: LocalInstallPackageJsonType) => this.getProp(json, 'local');

        const r = mode === 'sync' ? get(this.json) : this.readJson().then(get);
        return r as SyncAsyncType<M, Local>;
    }

    private getLocalProp<M extends SyncAsyncMode>(mode: M, prop: keyof Local) {
        const get = (local: Local) => this.getProp(local, prop);

        const r = mode === 'sync' ? get(this.getLocal('sync')) : this.getLocal('async').then(get);
        return r as SyncAsyncType<M, ValueOf<Local>>;
    }

    public get local(): SyncAsync<Local> {
        const _this = this;

        return {
            get sync() { return _this.getLocal('sync'); },
            get async() { return _this.getLocal('async'); }
        };
    }

    public localProp(prop: keyof Local): SyncAsync<ValueOf<Local>> {
        const _this = this;

        return {
            get sync() { return _this.getLocalProp('sync', prop); },
            get async() { return _this.getLocalProp('async', prop); }
        };
    }

}
