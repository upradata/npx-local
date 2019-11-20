import yargs from 'yargs';
import { red } from './util/colors';

export class YargsAddArgument {
    public supportedArgs = [ '$0', '_', 'version', 'help' ];

    constructor(public yargsArgv: yargs.Argv<any>) { }

    public normalizeArg(name: string) {
        let normalize = '';
        let previousSkipped = false;
        let firstChar = true;

        for (const c of name) {
            if (c !== '.' && c !== '-') {
                normalize += !firstChar && previousSkipped ? c.toUpperCase() : c;
                firstChar = false;
                previousSkipped = false;
            }
            else
                previousSkipped = true;

        }

        return normalize;
    }

    public addOption(name: string, options?: yargs.Options) {
        this.addToSupportedArg(name);

        if (options) {
            const aliases = typeof options.alias === 'string' ? [ options.alias ] : options.alias;
            for (const alias of aliases)
                this.addToSupportedArg(alias);

            this.yargsArgv.option(name, options);
        }

        return this;
    }

    private addToSupportedArg(arg: string) {
        const normalizedArg = this.normalizeArg(arg);

        this.supportedArgs.push(arg);
        if (normalizedArg !== arg)
            this.supportedArgs.push(normalizedArg);
    }

    /* public addSupportedArgs(...args: string[]) {
        for (const a of args) this.supportedArgs.push(a);
    } */

    public unvalidParams(argv: yargs.Arguments<any>) {
        const unvalidParams = [];

        for (const arg of Object.keys(argv)) {
            if (!this.supportedArgs.includes(arg))
                unvalidParams.push(arg);
        }

        return unvalidParams.length === 0 ? undefined : unvalidParams;
    }

    unvalidParamsAndExit(argv: yargs.Arguments<any>) {
        const unvalidOptions = this.unvalidParams(argv);

        if (unvalidOptions !== undefined) {
            console.error(red`The following options are not accepted:`);
            for (const arg of unvalidOptions)
                console.error(red`  -${arg}`);

            console.log();
            this.yargsArgv.showHelp();
            process.exit(1);
        }
    }
}
