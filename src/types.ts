
export interface RelativeAbsolute {
    relative: string;
    absolute: string;
}


export interface SourceDest<T> {
    source: T;
    dest: T;
}


export interface Skipped {
    skipped: boolean;
    reason: string;
}

export function isSkipped(copiedFile: any): copiedFile is Skipped {
    return (copiedFile as any).skipped;
}


export enum Errors {
    BAD_ARGUMENT = 'error/bad-argument',
    UNEXPECTED_VALUE = 'error/unexpected-value',
    NO_PACKAGE_JSON = 'error/no-package-json',
}


export type DependencyType = 'prod' | 'dev' | 'peers';
export type DependencyName = 'dependencies' | 'devDependencies' | 'peersDependencies';
