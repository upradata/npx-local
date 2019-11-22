import { ColorType, colors as COLORS, StyleTemplate } from '@upradata/node-util';
import { terminalWidth } from './common';

const c = COLORS as ColorType;

export const colors = COLORS;
export const yellow = c.yellow.$;
export const green = c.green.$;
export const red = c.red.$;
export const blue = c.blue.$;
export const cyan = c.cyan.$;
export const highlightMagenta = c.white.bgMagenta.$;
export const highlightYellow = c.white.bgYellow.$;
export const highlightGreen = c.white.bgGreen.$;
export const highlightCyan = c.white.bgCyan.$;

export const fullWidthBg = (style: StyleTemplate) => style` `.repeat(terminalWidth);
