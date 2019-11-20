
export interface OriginalAbsolute {
    original: string;
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

export function isSkipped<T>(copiedFile: SourceDest<T> | Skipped): copiedFile is Skipped {
    return (copiedFile as any).skipped;
};
