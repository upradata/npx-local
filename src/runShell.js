'use strict';

const Observable = require('rxjs/Observable').Observable;

const { spawn } = require('child_process');

function runShell(command, args) {
    const subscribe = function (observer) {
        const cmd = spawn(command, args, { windowsHide: true, cwd: process.cwd() });


        cmd.stdout.on('data', data => observer.next(null, data));

        cmd.stderr.on('data', err => observer.next(err));

        // cmd.on('error', code => observer.error(code));

        cmd.on('close', code => observer.complete(code));
    };


    const cmdObservable$ = Observable.create(subscribe);
    return cmdObservable$;
}


module.exports = runShell;
