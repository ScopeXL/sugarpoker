var _ = require('underscore'),
    moment = require('moment');

const chalk = require('chalk');

module.exports = function Debugger(environment) {
    this.debug = {};

    if (_.isEqual(environment, 'dev')) {
        // bind the events to the console for output

        // Log a console message using the chalk package
        // Usage: log('My message!', 'yellow', 'My second message!', 'green')
        this.debug.log = function() {
            var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)),
                logMsg = '',
                timestamp = chalk.gray('[' + moment().format('HH:mm:ss') + ']');

            if (args.length % 2 === 0) {
                for (var i = 0; i < args.length; i++) {
                    if (i % 2 === 0) {
                        var message = args[i];
                        var color = args[i + 1];

                        logMsg += chalk[color](message) + ' ';
                    }
                }

                console.log(timestamp + ' ' + logMsg);
            } else {
                console.log(chalk.red('Error: logging must take parameters divisible by 2'));
            }
        };
        //this.debug.log = console.log.bind(console, moment().format('HH:mm:ss'));
        this.debug.warn = console.warn.bind(console, moment().format('HH:mm:ss'));
        this.debug.error = console.error.bind(console, moment().format('HH:mm:ss'));
    } else {
        // do not log the events to the console
        this.debug.log = function() {};
        this.debug.warn = function() {};
        this.debug.error = function() {};
    }

    return this.debug;
};
