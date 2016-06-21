appControllers.controller('MainCtrl', ['$scope', '$location',
    function($scope, $location) {
        // Join a room
        $scope.join = function() {
            $location.path('/' + $scope.room);
        };
    }
]);
