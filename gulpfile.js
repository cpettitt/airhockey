"use strict";

process.env.NODE_ENV = process.env.NODE_ENV || "development";

var gulp = require("gulp");
gulp.util = require("gulp-util");
var plumber = require("gulp-plumber");
var del = require("del");
var watch = require("gulp-watch");
var browserify = require("browserify");
var watchify = require("watchify");
var source = require("vinyl-source-stream");
var livereload = require("gulp-livereload");
var jshint = require("gulp-jshint");
var jshintStylish = require("jshint-stylish");
var fork = require("child_process").fork;

var buildDir = "build";
var persistent = true;
if ("WATCH" in process.env && process.env.WATCH.toLowerCase() === "false") {
    gulp.util.log("Not using persistent watches");
    persistent = false;
}

gulp.task("assets", function() {
    var assets = [
        "assets/**/*.css",
        "assets/**/*.html",
        "assets/**/*.json",
        "assets/**/*.png"
    ];
    gulp.src(assets)
        .pipe(plumber())
        .pipe(watch(assets, { persistent: persistent }))
        .pipe(gulp.dest(buildDir))
        .pipe(livereload());
});

gulp.task("client", function() {
    gulp.src("client/**/*.js")
        .pipe(plumber())
        .pipe(watch("client/**/*.js", { persistent: persistent }))
        .pipe(jshint())
        .pipe(jshint.reporter(jshintStylish));

    var bundler = browserify("./client/index.js", { debug: true });
    if (persistent) {
        bundler = watchify(bundler);
    }
    bundler.on("update", bundle);
    bundler.on("log", gulp.util.log);
    bundle();

    function bundle() {
        return bundler.bundle()
            .on("error", function(err) { gulp.util.log("Browserify error: " + err); })
            .pipe(source("bundle.js"))
            .pipe(gulp.dest("build/js"))
            .pipe(livereload());
    }
});

gulp.task("serve", function(cb) {
    if (persistent) {
        livereload.listen({ basepath: "build" });
        reloadServer(cb);
    } else {
        gulp.util.log("Skipping serve with WATCH=false.");
    }
});

var server;
function reloadServer(cb) {
    cb = cb || function() {};
    if (server) {
        server.on("exit", function() { startServer(cb); });
        server.kill();
    } else {
        startServer(cb);
    }
}

function startServer(cb) {
    server = fork("./server/index");
    server.on("exit", function(code) {
        if (code) {
            gulp.util.log("server process ended with status code: " + code);
        }
    });
    cb();
}

gulp.task("clean", function(cb) {
    del(buildDir, cb);
});

gulp.task("default", ["assets", "client", "serve"]);
