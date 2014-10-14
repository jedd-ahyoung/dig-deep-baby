var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var stylus = require('gulp-stylus');
var imagemin = require('gulp-imagemin');
var rm = require('del');
var browserSync = require('browser-sync');

var paths = {
	js: 'app/js/*.js',
	css: 'app/css/*.styl',
	lib: 'app/lib/jquery/dist/jquery.min.js',
	img: 'app/img/*',
	index: '*.html',
	dist: 'dist'
};

gulp.task('lint', function () {
	return gulp.src(paths.js)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter())
		.pipe(jshint.reporter('fail'));
});

gulp.task('lib', function () {
	return gulp.src(paths.lib)
		.pipe(gulp.dest('dist/lib'));
});

gulp.task('js', function () {
	return gulp.src(paths.js)
		.pipe(concat('bundle.js'))
		.pipe(uglify())
		.pipe(rename({
			extname: '.min.js'
		}))
		.pipe(gulp.dest('dist/js'));
});

gulp.task('build', ['lint','lib', 'js', 'css', 'img']);

gulp.task('css', function () {
	return gulp.src(paths.css)
		.pipe(stylus())
		.pipe(gulp.dest('dist/css'));
});

gulp.task('img', function () {
	return gulp.src(paths.img)
		.pipe(imagemin())
		.pipe(gulp.dest('dist/img'));
});

gulp.task('serve', function () {
	browserSync({
		server: {
			baseDir: '.'
		}
	});

	gulp.watch([paths.js, paths.css, paths.img], ['lib', 'js', 'css', 'img', browserSync.reload])
	gulp.watch([paths.index, 'dist/*'], browserSync.reload);
});

gulp.task('clean', function (callback) {
	rm(['dist'], callback);
});

gulp.task('watch', function () {
	gulp.watch([paths.js, paths.index, paths.css], ['build', 'css'])
});

gulp.task('default', ['build']);