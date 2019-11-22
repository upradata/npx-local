import yargs from 'yargs/yargs';
import { Argv, Options, Arguments } from 'yargs';
import { red } from './util/colors';
import camelcase from 'camelcase';
import { ObjectOf } from '@upradata/util';

class _ParseArgs<T> {
    public supportedArgs = [ '$0', '_', 'version', 'help' ];
    public yargs: Argv<T>;

    constructor() {
        // set inheritance
        this.yargs = yargs(process.argv.slice(2), undefined, require) as Argv<T>;
        // yargs does not use a prototype
        const proto = Object.getPrototypeOf(this);
        Object.setPrototypeOf(proto, this.yargs);

    }

    option(name: string, options?: Options) {
        const args: string[] = [ name ];

        const camelArg = camelcase(name);
        if (camelArg !== name)
            args.push(camelArg);

        for (const arg of args) {
            this.yargs.option(arg, options);
            this.supportedArgs.push(arg);
        }

        const aliases = typeof options.alias === 'string' ? [ options.alias ] : options.alias;
        for (const alias of aliases)
            this.supportedArgs.push(alias);

        return this;
    }

    options(keys: ObjectOf<Options>) {
        for (const [ key, options ] of Object.entries(keys))
            this.option(key, options);

        return this;
    }

    public unvalidParams(argv: Arguments<any>) {
        const unvalidParams = [];

        for (const arg of Object.keys(argv)) {
            if (!this.supportedArgs.includes(arg))
                unvalidParams.push(arg);
        }

        return unvalidParams.length === 0 ? undefined : unvalidParams;
    }

    public unvalidParamsAndExit(argv: Arguments<any>) {
        const unvalidOptions = this.unvalidParams(argv);

        if (unvalidOptions !== undefined) {
            console.error(red`The following options are not accepted:`);
            for (const arg of unvalidOptions)
                console.error(red`  -${arg}`);

            console.log();
            this.yargs.showHelp();
            process.exit(1);
        }
    }
}

export type ParseArgs<T> = _ParseArgs<T> & Argv<T>;
export const ParseArgs = _ParseArgs;
