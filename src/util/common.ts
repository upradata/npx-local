export const terminalWidth = process.stdout.columns - 1 || 80;

export function stringAlignCenter(s: string, size: number = terminalWidth): string {

    const trim = s.trim();
    const whitespaceWidth = size - trim.length;

    if (whitespaceWidth <= 0)
        return s;

    const beginL = Math.floor(whitespaceWidth / 2) - 1; // -1 je ne sais pas pk :)
    const endL = whitespaceWidth - beginL;


    return ' '.repeat(beginL) + trim + ' '.repeat(endL);
}
