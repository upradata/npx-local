
let aaaa;

const yargs = require('yargs')
    .usage('$0', 'Npm Local Install', (yargs) => {
        aaaa = yargs;
        yargs.
            option('position-d', {
                type: 'string',
                describe: 'position',
                conflicts: 'aad',
                demandOption: true
            }).option('aa', {
                type: 'boolean',
                count: true
            }).option('f', {
                alias: 'file',
                demandOption: true,
                default: '/etc/passwd',
                describe: 'x marks the spot',
                type: 'string'
            }).help();
    }, function (argv) {
        console.log('hello $0 welcome to yargs!');
        aaaa.help();
    })
    .help()
    .argv;

console.log(yargs);
