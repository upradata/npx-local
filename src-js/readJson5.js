const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');

module.exports = function $readJson(directory, filename) {
    return new Promise((resolve, reject) => {

        const file = path.join(directory, filename);

        if (!fs.existsSync(file)) {
            const msg = `${file} doesn't exist`;
            console.error(msg.red);
            reject({ err: msg });
        }

        fs.readFile(file, 'utf8', (err, data) => {
            if (err)
                reject({ err });
            else
                resolve(data === '' ? {} : JSON5.parse(data));
        });
    });
};
