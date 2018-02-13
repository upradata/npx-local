const { gulp } = require('gulp');
const ts = require('gulp-typescript');
const fs = require('fs');

const libDir = 'lib';
// If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./
const tsProject = ts.createProject('tsconfig.json', { sourceRoot: './' });


gulp.task('scripts', function () {
    // You can replace gulp.src(...) with tsProject.src() to load files based on the tsconfig file (based on files, excludes and includes)
    const tsResult = tsProject.src()
        .pipe(tsProject());

    fs.readdir(path, function (err, items) {
        console.log(items);

        for (var i = 0; i < items.length; i++) {
            console.log(items[i]);
        }
    });


    return merge([
        tsResult.dts.pipe(gulp.dest('release/definitions')),
        tsResult.js.pipe(gulp.dest('release/js'))
    ]);

    // return tsResult.js.pipe(gulp.dest(libDir));
});
