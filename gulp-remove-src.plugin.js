const through = require('through2');
const PluginError = require('plugin-error');
const merge = require('merge2');


// consts
const PLUGIN_NAME = 'gulp-remove-src';

function prefixStream(prefixText) {
    let stream = through();
    stream.write(prefixText);
    return stream;
}

// plugin level function (dealing with files)
function gulpRemoveSrc(prefixText) {
    if (!prefixText) {
        throw new PluginError(PLUGIN_NAME, 'Missing prefix text!');
    }

    prefixText = new Buffer(prefixText); // allocate ahead of time

    // creating a stream through which each file will pass
    let stream = through.obj(function (file, enc, cb) {
        if (file.isBuffer()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
            return cb();
        }

        if (file.isStream()) {
            // define the streamer that will transform the content
            let streamer = prefixStream(prefixText);
            // catch errors from the streamer and emit a gulp plugin error
            streamer.on('error', this.emit.bind(this, 'error'));
            // start the transformation
            file.contents = file.contents.pipe(streamer);
        }

        // make sure the file goes through the next gulp plugin
        this.push(file);
        // tell the stream engine that we are done with this file
        cb();
    });

    // returning the file stream
    return stream;
}

// exporting the plugin main function
module.exports = gulpRemoveSrc;
