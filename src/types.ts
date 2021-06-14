
export interface RelativeAbsolute {
    relative: string;
    absolute: string;
}


export interface SourceDest<T> {
    source: T;
    dest: T;
}

export interface FromTo<From, To = From> {
    from: From;
    to: To;
}

export interface Skipped {
    skipped: boolean;
    reason: string;
}

export function isSkipped<T>(copiedFile: any): copiedFile is Skipped {
    return (copiedFile as any).skipped;
};



export enum Errors {
    BAD_ARGUMENT = 'error/bad-argument',
    UNEXPECTED_VALUE = 'error/unexpected-value',
    NO_PACKAGE_JSON = 'error/no-package-json',
}
