var gulp = require('gulp'),
    watch =require('gulp-watch'),
    loadPlugins = require('gulp-load-plugins'),
    source = require('vinyl-source-stream'),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    to5ify = require('6to5ify'),
    plugins = loadPlugins();

function buildJS() {

    return browserify('./src/reactive.js', { debug: false })
    //.add(require.resolve('6to5/polyfill'))
        .transform(to5ify)
        .bundle()
        .on('error', (e) => {
            console.error(e.message);
            this.emit('end');
        })
        .pipe(plugins.plumber())
        .pipe(source('reactive.js'))
        .pipe(buffer())
        .pipe(plugins.sourcemaps.init({loadMaps: true}))
        //.pipe(plugins.babel({
        //    presets: ['es2015']
        //}))
        //.pipe(plugins.uglify({mangle: false}))
        .pipe(plugins.sourcemaps.write('./', {sourceRoot: 'src'}))
        .pipe(gulp.dest('./dist/js'))
        .pipe(plugins.livereload({quiet: true}));
}


gulp.task('js', buildJS);


gulp.task('default', ['js'], () => {
    plugins.livereload.listen();
    gulp.watch('src/**/*.js', ['js']);
});




