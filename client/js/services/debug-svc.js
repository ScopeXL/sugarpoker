var Debugger = function(environment) {
    this.debug = {};

    if (_.isEqual(environment, 'dev')) {
        this.debug.log = console.log.bind(window.console, moment().format('LTS'));
        this.debug.info = console.info.bind(window.console, moment().format('LTS'));
        this.debug.warn = console.warn.bind(window.console, moment().format('LTS'));
        this.debug.error = console.error.bind(window.console, moment().format('LTS'));

    } else {
        // do not log the events to the console
        this.debug.log = function() {};
        this.debug.info = function() {};
        this.debug.warn = function() {};
        this.debug.error = function() {};
    }

    return this.debug;
};
