app.service('SocketSvc', ['UserSvc', 'RoomSvc', '$rootScope',
    function(UserSvc, RoomSvc, $rootScope) {
        var socketSvc = {},
            socket;

        socketSvc.emit = function(emitMethod, attributes) {
            socket.emit(emitMethod, attributes);
        };

        // connect to socket server
        socketSvc.connect = function(username, roomId) {
            initSocket(username, roomId);
        };

        // Initialize the socket connection
        function initSocket(username, roomId) {
            socket = io('https://sugar.roesch.io', {
                reconnection: true,
                query: 'room=' + roomId + '&username=' + username,
                path: '/socket/socket.io'
            });

            socket.on('connect', function() {
                debug.log('Connected');
                UserSvc.socketId = socket.id;

                $('#disconnect-overlay').fadeOut(500);
            });

            socket.on('connect_error', function() {
                debug.log('Connection Error');
            });

            socket.on('reconnect', function() {
                debug.log('Reconnected');
                debug.log('Rejoining the room');
            });
            socket.on('reconnecting', function() {
                debug.log('Reconnecting');
            });
            socket.on('reconnect_error', function() {
                debug.log('Reconnect Error');
            });
            socket.on('reconnect_failed', function() {
                debug.log('Reconnect Failed');
            });

            socket.on('disconnect', function() {
                debug.log('Disconnected');

                $('#disconnect-overlay').fadeIn(500, function() {
                    // Clear all the users
                    UserSvc.clearUsers();
                    $rootScope.$broadcast('socket:disconnect');
                    $rootScope.$apply();
                });
            });

            // Set a new timer countdown
            socket.on('timer:countdown', function(countdown) {
                $rootScope.$broadcast('timer:countdown', countdown);
                $rootScope.$apply();
            });

            // Start timer
            socket.on('timer:start', function() {
                $rootScope.$broadcast('timer-start');
                $rootScope.$apply();
            });

            // Stop timer
            socket.on('timer:stop', function() {
                $rootScope.$broadcast('timer-stop');
                $rootScope.$apply();
            });

            // Reset timer
            socket.on('timer:reset', function() {
                $rootScope.$broadcast('timer-reset');
                $rootScope.$apply();
            });

            // Reset voting
            socket.on('vote:reset', function() {
                $rootScope.$broadcast('vote:reset');
                $rootScope.$apply();
                // hide the voting modal if the current vote has been reset
                $('#vote-modal').modal('hide');
            });

            // Start a vote
            socket.on('vote:start', function() {
                $rootScope.$broadcast('vote:start');
                $rootScope.$apply();
            });

            // When the voting ends set all the user votes
            socket.on('vote:end', function(userVotes) {
                $rootScope.$broadcast('vote:end', userVotes);
                $rootScope.$apply();
                $('#vote-modal').modal('hide');
            });

            // reload a user
            socket.on('user:reload', function(details) {
                debug.log('User reload triggered...');

                _.each(UserSvc.users, function(user) {
                    // matched with existing user, overwrite their details
                    if (_.isEqual(user.get('socketId'), details.socketId)) {
                        user.reload(details);
                        debug.log('Updated user: ' + user.get('username'));
                        debug.log(user);
                    }
                });
            });

            // reload the room data
            socket.on('room:reload', function(details) {
                debug.log('Room reload triggered...');
                RoomSvc.reload(details);
            });

            // User was able to join the room
            socket.on('join:success', function(data) {
                debug.log('Successfully joined the room');
                // Setup the user room object
                RoomSvc.init(data.room);
                // Reset the timer
                setTimeout(function() {
                    $rootScope.$broadcast('timer-reset');
                    $rootScope.$apply();
                }, 0);

                // Add all users
                UserSvc.addUsers(data.users);
                // Set the local user object
                UserSvc.setLocalUser(socket.id);

                $('#room-setup').fadeOut(500, function() {
                    $('#room-details').fadeIn(500);
                });

                $rootScope.$broadcast('join:success');

                // If there is an active vote
                if (RoomSvc.get('activeVote')) {
                    debug.log('There is an active vote');
                    $rootScope.$broadcast('vote:start');
                }

                $rootScope.$apply();
            });

            // A user has joined the room
            socket.on('user:join', function(userData) {
                debug.log('A user has joined');
                UserSvc.addUser(userData);
                $rootScope.$broadcast('user:connected', userData.socketId);
                $rootScope.$apply();
            })

            // A user has been disconnected
            socket.on('user:disconnected', function(socketId) {
                debug.log('A user has disconnected');
                var removeUserIndex = null;

                _.each(UserSvc.users, function(user, index) {
                    if (user.get('socketId') === socketId) {
                        removeUserIndex = index;
                    }
                });

                if (!_.isNull(removeUserIndex)) {
                    debug.log('The user has been removed');
                    UserSvc.users.splice(removeUserIndex, 1);
                    $rootScope.$apply();
                }
            });
        }

        return socketSvc;
    }
]);
