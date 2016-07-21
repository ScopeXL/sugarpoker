// Set up the console events based on environment
var debug = new Debugger('dev');

// initialize the application
var app = angular.module('poker', ['ngRoute', 'timer', 'appControllers']);

// initialize the controllers module
var appControllers = angular.module('appControllers', []);

// Setup routes
app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.
        when('/', {
            templateUrl: 'partials/room.html',
            controller: 'RoomCtrl'
        }).
        when('/:roomId', {
            templateUrl: 'partials/room.html',
            controller: 'RoomCtrl'
        }).
        otherwise({
            redirectTo: '/'
        });

        // use the HTML5 History API
        //$locationProvider.html5Mode(true);
    }
]);

app.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind('keydown keypress', function(event) {
            if (event.which === 13) {
                scope.$apply(function() {
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

// This makes any element have a tooltip
// Usage: <div tooltip>Foobar</div>
app.directive('tooltip', function() {
    return {
        // A = attribute, E = Element, C = Class and M = HTML Comment
        restrict: 'A',
        //The link function is responsible for registering DOM listeners as well as updating the DOM.
        link: function(scope, element, attrs) {
            // set the placement
            var placement = 'bottom';
            // set the trigger
            var trigger = 'hover focus';

            // check for different handles
            if (!_.isUndefined(attrs.placement)) {
                placement = attrs.placement;
            }
            // check for a different trigger
            if (!_.isUndefined(attrs.trigger)) {
                trigger = attrs.trigger;
            }

            element.tooltip({
                placement: placement,
                trigger: trigger,
                container: 'body'
            });
        }
    };
});
