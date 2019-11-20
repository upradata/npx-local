function addArg(name, options, yargs) {
    const normalizeArg = name => {
        let normalize = '';
        let previousSkipped = false;
        let firstChar = true;

        for (const c of name) {
            if (c !== '.' && c !== '-') {
                normalize += !firstChar && previousSkipped ? c.toUpperCase() : c;
                firstChar = false;
                previousSkipped = false;
            }
            else
                previousSkipped = true;

        }

        return normalize;
    };

    const normalizedArg = normalizeArg(name);

    addArg.supportedArgs.push(name);
    if (normalizedArg !== name)
        addArg.supportedArgs.push(normalizedArg);

    yargs.positional(name, options);
}

addArg.supportedArgs = ['$0', '_', 'version', 'help'];

addArg.addSupportedArgs = (...arg) => { for (const a of arg) addArg.supportedArgs.push(a); };


addArg.unvalidParams = (argv) => {
    let unvalidParams = [];

    for (const arg of Object.keys(argv)) {
        if (!addArg.supportedArgs.includes(arg))
            unvalidParams.push(arg);
    }

    return unvalidParams.length === 0 ? undefined : unvalidParams;
};


addArg.unvalidParamsAndExit = (argv, showHelp) => {
    const unvalidOptions = addArg.unvalidParams(argv);

    if (unvalidOptions !== undefined) {
        console.error('The following options are not accepted:'.red);
        for (const arg of unvalidOptions)
            console.error(`  -${arg}`.red);

        console.log();
        showHelp();
        process.exit(1);
    }

};

module.exports = addArg;
