const NodeEnvironment = require('jest-environment-node');
const { chain } = require('@upradata/util');

class JestCustomEnvironment extends NodeEnvironment {
    constructor(config) {
        super(config);
        this.jestErrorHasInstance = this.global.Error[Symbol.hasInstance];
    }

    async setup() {
        await super.setup();
        // Workaround for this bug https://github.com/facebook/jest/issues/2549
        this.jestErrorHasInstance = this.global.Error[Symbol.hasInstance];
        Object.defineProperty(this.global.Error, Symbol.hasInstance, {
            value: target => {
                // the workaround is not working. So I add an additional test
                // && target.message && target.stack
                return chain(target.constructor.name) === 'Error' ||
                    target instanceof Error || this.jestErrorHasInstance(target);
            }
        });
    }

    async tearDown() {
        await super.tearDown();
        Object.defineProperty(this.global.Error, Symbol.hasInstance, { value: this.jestErrorHasInstance });
    }
}

module.exports = JestCustomEnvironment;
