#!/usr/bin/env node

import { LocalInstall } from './local-install';
import { processArgs } from './yargs';
import { green, yellow } from './util/colors';

new LocalInstall(processArgs()).install().then(() => {
    // console.log(green`\n\Local dependencies installed!`);
}).catch(e => {
    console.warn(yellow`${typeof e === 'string' ? e : `${e.message}\n${e.stack}`}`);
});
