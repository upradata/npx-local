import yargs from 'yargs/yargs';
import { Argv, Options, Arguments } from 'yargs';
import { red } from './util/colors';
import camelcase from 'camelcase';
import { ObjectOf } from '@upradata/util';

export interface InvalidParameter {
    parameter: string;
    reason: string;
}

class _ParseArgs<T> {
    public supportedArgs = [ '$0', '_', 'version', 'help' ];
    public yargs: Argv<T>;

    constructor() {
        // set inheritance
        this.yargs = yargs(process.argv.slice(2), undefined, require) as Argv<T>;
        // yargs does not use a prototype
        let proto = Object.getPrototypeOf(this);
        while (_ParseArgs !== proto.constructor) {
            proto = Object.getPrototypeOf(proto);
        }
        Object.setPrototypeOf(proto, this.yargs);

    }

    public option(name: string, options?: Options) {
        // yargs add camel case option name already
        // we add it just in supportedArgs
        this.yargs.option(name, options);

        const args: string[] = [ name ];

        const camelArg = camelcase(name);
        if (camelArg !== name)
            args.push(camelArg);

        for (const arg of args) {
            this.supportedArgs.push(arg);
        }

        const aliases = typeof options.alias === 'string' ? [ options.alias ] : options.alias;
        for (const alias of aliases)
            this.supportedArgs.push(alias);

        return this;
    }

    public options(keys: ObjectOf<Options>) {
        for (const [ key, options ] of Object.entries(keys))
            this.option(key, options);

        return this;
    }

    public invalidParams(argv: Arguments<any>): InvalidParameter[] {
        const unvalidParams: InvalidParameter[] = [];

        for (const arg of Object.keys(argv)) {
            if (!this.supportedArgs.includes(arg))
                unvalidParams.push({ parameter: arg, reason: `Invalid option` });
        }

        return unvalidParams.length === 0 ? [] : unvalidParams;
    }

    public invalidParamsAndExit(argv: Arguments<any>) {
        const invalidParams = this.invalidParams(argv);

        if (invalidParams.length > 0) {
            for (const { parameter, reason } of invalidParams)
                console.error(red`  - parameter ${parameter}: ${reason}`);

            console.log();
            this.yargs.showHelp();
            process.exit(1);
        }
    }
}

export type ParseArgs<T> = _ParseArgs<T> & Argv<T>;
export const ParseArgs = _ParseArgs;
