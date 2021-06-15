import { Inject } from '@upradata/dependency-injection';
import { LocalInstallOptions } from './local-install.options';

export class Logger {
    constructor(@Inject(LocalInstallOptions) private options: LocalInstallOptions) { }

    console(type: 'log' | 'warn' | 'error', ...args: any[]) {
        if (!this.options.quiet)
            console[ type ](...args);
    }

    log(...args: any[]) {
        this.console('log', ...args);
    }

    warn(...args: any[]) {
        this.console('warn', ...args);
    }

    error(...args: any[]) {
        this.console('error', ...args);
    }
}
