module.exports = function (grunt) {
    "use strict";

    //TODO: clean dirs & zip before build

    grunt.initConfig({
        copy: {
            all: {
                files: [
                    {
                        expand: true,
                        src: ["manifest.json",
                            "_locales/**",
                            "css/*.css",
                            "js/*.js",
                            "images/**",
                            "*.js",
                            "popup.html",
                            "options.html"],
                        cwd: "app/",
                        dest: "build/"
                    }
                ]
            }
        },
        compress: {
            main: {
                options: {
                    archive: 'anki-adder-plus.zip',
                    mode: 'zip'
                },
                files: [
                    {expand: true, cwd: 'build/', src: '**'}
                ]
            }
        },
        karma: {
            options: {
                configFile: 'karma.conf.js'
            },
            dev: {
                singleRun: false,
                autoWatch: true
            },
            prod: {
                singleRun: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.registerTask("default", [
        "copy"
    ]);

    grunt.registerTask("release", [
        "copy",
        "compress"
    ]);

    grunt.registerTask('build', [
        'karma:prod',
        'copy',
        'compress'
    ]);
};