
export interface OriginalAbsolute {
    original: string;
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
