appControllers.controller('RoomCtrl', [
    '$scope',
    'UserSvc',
    'RoomSvc',
    'SocketSvc',
    'PeerSvc',
    '$routeParams',
    '$rootScope',
function(
    $scope,
    UserSvc,
    RoomSvc,
    SocketSvc,
    PeerSvc,
    $routeParams,
    $rootScope) {
        // Set the username from localStorage if it exists
        $scope.username = localStorage.getItem('username');
        $scope.users = UserSvc.users;
        // Track room data in the DOM
        $scope.room;
        // The timer start time to count down from (in seconds)
        $scope.timerCountdown = 0;
        // Set the initial progress level to normal
        $scope.progressLevel = 'normal';
        // Set the room name
        $scope.roomId = $routeParams.roomId;

        $scope.$on('timer-reset', function(ev) {
            debug.log('Timer was reset');
            $scope.timerRunning = false;
        });

        $scope.$on('timer-stop', function() {
            debug.log('Timer was stopped');
            $scope.timerRunning = false;
        });

        $scope.$on('timer-start', function() {
            debug.log('Timer was started');
            $scope.timerRunning = true;
        });

        $scope.$on('timer-tick', function(ev, data) {
            // calculate number of seconds remaining
            var secondsRemaining = data.millis / 1000;

            // calculate percentage left
            var percentageRemaining = Math.ceil((secondsRemaining / $scope.timerCountdown) * 100);
            //debug.log(percentageRemaining);

            if (percentageRemaining <= 30) {
                // show danger
                if (!_.isEqual($scope.progressLevel, 'danger')) {
                    $scope.progressLevel = 'danger';
                    $scope.$apply();
                }
            } else if (percentageRemaining <= 50) {
                // show warning
                if (!_.isEqual($scope.progressLevel, 'warning')) {
                    $scope.progressLevel = 'warning';
                    $scope.$apply();
                }
            } else {
                // consider everything else as normal
                if (!_.isEqual($scope.progressLevel, 'normal')) {
                    $scope.progressLevel = 'normal';
                    //$scope.$apply();
                }
            }
        });

        // Invite others
        $scope.inviteOthers = function() {
            $('#invite-modal').modal('show');
        };

        // Join the room
        $scope.join = function() {
            SocketSvc.connect($scope.username, $routeParams.roomId);
        };

        // Start/Pause the timer
        $scope.pauseTimer = function(pause) {
            if (pause) {
                $scope.$broadcast('timer-stop');
                SocketSvc.emit('timer:stop');
            } else {
                $scope.$broadcast('timer-start');
                SocketSvc.emit('timer:start');
            }
        };

        // Toggle a call
        $scope.toggleCall = function(action) {
            switch (action) {
                case 'end':
                    // end the call
                    UserSvc.set('activeCall', false);
                    UserSvc.set('activeWebcam', false);
                    PeerSvc.endCall();
                    break;
                case 'video':
                    // start the video call
                    UserSvc.set('activeCall', true);
                    UserSvc.set('activeWebcam', true);
                    PeerSvc.startCall({
                        video: true,
                        audio: true
                    });
                    break;
                case 'audio':
                    // start the audio call
                    UserSvc.set('activeCall', true);
                    UserSvc.set('activeWebcam', false);
                    PeerSvc.startCall({
                        video: false,
                        audio: true
                    });
                    break;
            }
        };

        // Toggle the microphone mute/unmute
        $scope.toggleMicrophone = function() {
            if (UserSvc.get('muted')) {
                // unmute the user
                UserSvc.set('muted', false);
                PeerSvc.muteMicrophone(false);
            } else {
                // mute the user
                UserSvc.set('muted', true);
                PeerSvc.muteMicrophone(true);
            }
        };

        // When the user changes their username
        $scope.changeUsername = function() {
            localStorage.setItem('username', $scope.username);
        };

        // Edit the countdown timer
        $scope.handleEditCountdown = function(edit) {
            if (edit) {
                $scope.editCountdown = true;
                // force focus on the textbox
                setTimeout(function() {
                    $('#input-countdown').focus();
                }, 0);
            } else {
                var acceptCustomCountdown = true;

                // edit the countdown with the custom value
                debug.log($scope.customCountdown);
                var matchRegex = new RegExp('(\\d\\d):(\\d\\d)', 'g');
                var matches = matchRegex.exec($scope.customCountdown);
                if (!_.isNull(matches) && matches.length >= 3) {
                    var minutes = parseInt(matches[1]),
                        seconds = parseInt(matches[2]);
                    // confirm the numbers are below 60
                    if (minutes >= 60 || seconds >= 60) {
                        acceptCustomCountdown = false;
                        debug.log('Cannot parse minutes and seconds over 60');
                    } else {
                        debug.log('Minutes', minutes);
                        debug.log('Seconds', seconds);

                        $scope.timerCountdown = (minutes * 60) + seconds;
                    }
                } else {
                    acceptCustomCountdown = false;
                }

                if (acceptCustomCountdown) {
                    debug.log('Valid custom countdown, resetting the timer');
                    setTimeout(function() {
                        $scope.$broadcast('timer-reset');
                        SocketSvc.emit('timer:reset');
                        $scope.$apply();
                    }, 0);
                    // Alert server of new countdown limit
                    SocketSvc.emit('timer:countdown', $scope.timerCountdown);
                } else {
                    debug.log('Something went wrong setting a custom countdown');
                }

                $scope.editCountdown = false;
            }
        };

        // Edit the room topic
        $scope.handleEditTopic = function(edit) {
            if (edit) {
                $scope.showEditTopic = true;
                // force focus on the topic
                setTimeout(function() {
                    $('#input-topic').focus();
                }, 0);
            } else {
                $scope.showEditTopic = false;
            }
        };

        // When the topic is changed from the input
        $scope.editTopic = function() {
            SocketSvc.emit('topic:change', RoomSvc.get('topic'));
            //$('#countdown').attr('countdown', 300);
            $scope.$broadcast('timer-reset');
            SocketSvc.emit('timer:reset');
            if (!_.isEmpty(RoomSvc.get('topic'))) {
                // start the timer only when a topic exists
                $scope.$broadcast('timer-start');
                SocketSvc.emit('timer:start');
            }
        };

        // Call for a vote
        $scope.startVote = function() {
            SocketSvc.emit('vote:start');
            startVote({
                apply: false,
                reset: true
            });
        };

        // Reset voting
        $scope.resetVote = function() {
            resetVote({apply: false});
            SocketSvc.emit('vote:reset');
        };

        // Reveal votes even if everyone hasn't finished voting
        $scope.revealVote = function() {
            SocketSvc.emit('vote:reveal');
        };

        // When a user casts their vote
        $scope.castVote = function(vote) {
            debug.log('Vote: ', vote);

            // Send vote to server
            SocketSvc.emit('vote:cast', vote);
            // Set vote in the UI
            UserSvc.set('vote', vote);
            UserSvc.set('hasVoted', true);
            $('#vote-modal').modal('hide');
        };

        // Edit a users vote
        $scope.editVote = function(socketId) {
            if (RoomSvc.get('activeVote') && _.isEqual(UserSvc.get('socketId'), socketId)) {
                $('#vote-modal').modal('show');
            }
        };

        $scope.$on('timer:countdown', function(e, countdown) {
            $scope.timerCountdown = countdown;
        });

        $scope.$on('vote:reset', function(e, data) {
            resetVote({apply: true});
        });

        $scope.$on('vote:start', function(e, data) {
            startVote({
                apply: true,
                reset: true
            });
        });

        $scope.$on('vote:end', function(e, userVotes) {
            inputVotes(userVotes);
            // set the voting as ended
            $scope.voteEnd = true;
        });

        $scope.$on('join:success', function(e, data) {
            // Set the socket id
            $scope.socketId = UserSvc.socketId;
            // Track room in the DOM
            $scope.room = RoomSvc.room;
            // Override the timer countdown from the room settings
            $scope.timerCountdown = RoomSvc.get('countdown');
            // Set topic
            $scope.topic = RoomSvc.get('topic');

            // Create new peer
            PeerSvc.createPeer(UserSvc.socketId);
        });

        // When the socket disconnects
        $scope.$on('socket:disconnect', function(e, data) {
            $scope.users = UserSvc.users;
        });

        // reset voting for all users
        function resetVote(options) {
            debug.log('Resetting vote variables');
            $scope.voteEnd = false;
            _.each(UserSvc.users, function(u) {
                //u.set('vote', null);
                u.set('hasVoted', false);
            });
            if (!_.isUndefined(options) && options.apply) {
                $scope.$apply();
            }
            $scope.$broadcast('timer-reset');
            SocketSvc.emit('timer:reset');
        }

        // start a vote
        function startVote(options) {
            debug.log('A vote was started');
            // Remove reveal if already revealed
            $scope.reveal = false;
            // Reset voting
            if (!_.isUndefined(options.reset) && options.reset) {
                resetVote(options);
            }

            $('#vote-modal').modal('show');
        }

        // Place the users vote on their card
        function inputVotes(userVotes) {
            _.each(userVotes, function(voteItem) {
                var userItem = UserSvc.getUser(voteItem.socketId);
                if (userItem) {
                    if (_.isEqual(voteItem.vote, 'abstain')) {
                        voteItem.vote = 'X';
                    } else if (_.isEqual(voteItem.vote, 'unknown')) {
                        voteItem.vote = '?';
                    }
                    userItem.set('vote', voteItem.vote);
                }
            });
        }
    }
]);
