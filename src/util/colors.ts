import { TerminalStyles, styles } from '@upradata/node-util';
import { StyleTemplate } from '@upradata/util';
import { terminalWidth } from './common';

const s = styles as TerminalStyles;

export const colors = s;
export const yellow = s.yellow.$;
export const green = s.green.$;
export const red = s.red.$;
export const blue = s.blue.$;
export const cyan = s.cyan.$;
export const highlightMagenta = s.white.bgMagenta.$;
export const highlightYellow = s.white.bgYellow.$;
export const highlightGreen = s.white.bgGreen.$;
export const highlightCyan = s.white.bgCyan.$;

export const fullWidthBg = (style: StyleTemplate) => style` `.repeat(terminalWidth);
