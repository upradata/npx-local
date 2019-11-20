// /(?!(something)/) means will not match something
module.exports = { ...require('./jest-common.config'), testRegex: `${process.cwd()}/test/.+\\.spec\\.ts$`, };
