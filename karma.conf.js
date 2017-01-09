module.exports = function(config) {
    config.set({
        // base path, that will be used to resolve files and exclude
        basePath: './',

        frameworks: ['jasmine'],

        // list of files / patterns to load in the browser
        files: [
            'app/js/util/*.js',
            'test/*Spec.js'
        ],

        // list of files to exclude
        exclude: [
        ],

        // use dots reporter, as travis terminal does not support escaping sequences
        // possible values: 'dots', 'progress'
        // CLI --reporters progress
        reporters: ['dots', 'coverage'],

        // web server port
        // CLI --port 9876
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        // CLI --colors --no-colors
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        // CLI --log-level debug
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        // CLI --auto-watch --no-auto-watch
        autoWatch: false,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        // CLI --browsers Chrome,Firefox,Safari
        browsers: ['PhantomJS'],

        // If browser does not capture in given timeout [ms], kill it
        // CLI --capture-timeout 5000
        captureTimeout: 20000,

        // Auto run tests on start (when browsers are captured) and exit
        // CLI --single-run --no-single-run
        singleRun: true,

        // report which specs are slower than 500ms
        // CLI --report-slower-than 500
        reportSlowerThan: 500,

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/*.js': ['coverage']
        },

        coverageReporter: {
            type : 'html',
            dir : 'coverage/'
        },

        plugins: [
            'karma-jasmine',
            'karma-phantomjs-launcher',
            'karma-coverage'
        ]
    });
};