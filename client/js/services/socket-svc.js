app.service('SocketSvc', ['UserSvc', 'RoomSvc', 'WindowSvc', '$rootScope',
    function(UserSvc, RoomSvc, WindowSvc, $rootScope) {
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
            var url;

            if (_.isEqual(config.port, 443)) {
                url = 'https://' + config.host;
            } else if (_.isEqual(config.port, 80)) {
                url = 'http://' + config.host;
            } else {
                url = 'http://' + config.host + ':' + config.port;
            }

            socket = io(url, {
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

            // Receive a new message
            socket.on('message:receive', function(data) {
                /*data.message = data.message.replace(/((https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?)/gi,
                    '<a href="$1">$1</a>');*/
                $rootScope.$broadcast('message:receive', data);
            });

            // Server emits a timer tick event
            /*socket.on('timer:tick', function(remaining) {
                var duration = new moment.duration(remaining, 'seconds');
                var minutes = duration.get('minutes');
                var seconds = duration.get('seconds');

                if (minutes < 10) {
                    minutes = '0' + minutes;
                }
                if (seconds < 10) {
                    seconds = '0' + seconds;
                }

                $rootScope.$broadcast('timer:tick', {
                    remaining: remaining,
                    minutes: minutes,
                    seconds: seconds
                });
                $rootScope.$apply();
            });*/

            // Set a new timer countdown
            socket.on('timer:countdown', function(data) {
                $rootScope.$broadcast('timer:countdown', data.countdown);
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

            // Relay timer position to the requester
            socket.on('timer:fetch', function(requester) {
                debug.log('Timer Fetch has been requested');
                $rootScope.$broadcast('timer:fetch', requester);
            });

            // Timer value received from server relay
            socket.on('timer:value', function(value) {
                debug.log('Timer value is ' + value);

                $rootScope.$broadcast('timer:countdown', value);
                $rootScope.$apply();
                $rootScope.$broadcast('timer-reset');
                $rootScope.$apply();

                if (RoomSvc.get('activeCountdown')) {
                    debug.log('Countdown is active');
                    $rootScope.$broadcast('timer-start');
                    $rootScope.$apply();
                }
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
                    // Get the countdown time
                    socketSvc.emit('timer:fetch');

                    $rootScope.$broadcast('timer-reset');
                    $rootScope.$apply();
                }, 0);

                // Add all users
                UserSvc.addUsers(data.users);
                // Set the local user object
                UserSvc.setLocalUser(socket.id);

                $('#room-setup').fadeOut(500, function() {
                    $('#room-details').fadeIn(500, function() {
                        debug.log('Room is ready');
                        WindowSvc.render();
                        $('#chat-container').scrollTop($('#chat-container').prop('scrollHeight'));
                    });
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
