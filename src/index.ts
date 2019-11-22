#!/usr/bin/env node

import { LocalInstall } from './local-install';
import { processArgs } from './yargs';
import { green } from './util/colors';

new LocalInstall(processArgs()).install().then(() => {
    // console.log(green`\n\Local dependencies installed!`);
});
