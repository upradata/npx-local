const rimraf = require('rimraf');

export function $rm(fileOrDir) {
    return new Promise((resolve, reject) => {
        rimraf(fileOrDir, {}, err => {
            if (err)
                reject(err);
            else
                resolve('done');
        });
    });
}
