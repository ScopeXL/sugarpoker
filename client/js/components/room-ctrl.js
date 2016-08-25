appControllers.controller('RoomCtrl', [
    '$scope',
    'UserSvc',
    'RoomSvc',
    'SocketSvc',
    'PeerSvc',
    'WindowSvc',
    '$routeParams',
    '$location',
    '$sce',
    '$rootScope',
function(
    $scope,
    UserSvc,
    RoomSvc,
    SocketSvc,
    PeerSvc,
    WindowSvc,
    $routeParams,
    $location,
    $sce,
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
        // Init the messages array
        $scope.messages = [];
        // Default alert sound to on
        $scope.triggerAlertSound = true;

        // If no roomId is specified, show room textbox on DOM
        if (_.isUndefined($scope.roomId)) {
            $scope.noRoom = true;
        }

        $scope.$on('timer-reset', function(ev) {
            debug.log('Timer was reset');
            $scope.timerCountdown = RoomSvc.get('countdown');
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
            $scope.countdownRemaining = secondsRemaining;

            if (secondsRemaining <= 0) {
                // timer is up
                if ($scope.triggerAlertSound) {
                    var audio = new Audio('sounds/ding.wav');
                    audio.play();
                }
            } else {
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
            }
        });

        // Send a message
        $scope.send = function() {
            if (!_.isEmpty($scope.message)) {
                SocketSvc.emit('message:send', $scope.message);
                $scope.message = '';
            }
        };

        // Invite others
        $scope.inviteOthers = function() {
            $('#invite-modal').modal('show');
        };

        // Join the room
        $scope.join = function() {
            if (_.isUndefined($routeParams.roomId) || $scope.noRoom) {
                $location.path('/' + $scope.roomId);
            }
            SocketSvc.connect($scope.username, $scope.roomId);
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
        $scope.handleEditTopic = function(edit, skipFetch) {
            if (edit) {
                $scope.showEditTopic = true;
                // force focus on the topic
                setTimeout(function() {
                    $('#input-topic').focus();
                }, 0);
            } else {
                debug.log('Topic editing complete');
                $scope.showEditTopic = false;
                if (!skipFetch) {
                    // Fetch ticket
                    SocketSvc.emit('ticket:fetch');
                }
            }
        };

        // When the topic is changed from the input
        $scope.editTopic = function() {
            SocketSvc.emit('topic:change', RoomSvc.get('topic'));

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

        // Allow HTML in the DOM
        $scope.allowHtml = function(data) {
            return $sce.trustAsHtml(data);
        };

        // New message is received
        $scope.$on('message:receive', function(e, data) {
            addChatMessage(data);
        });

        $scope.$on('timer:countdown', function(e, countdown) {
            $scope.timerCountdown = countdown;
        });

        $scope.$on('timer:fetch', function(e, requester) {
            SocketSvc.emit('timer:value', {
                requester: requester,
                value: $scope.countdownRemaining
            });
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
            // Set messages
            $scope.messages = RoomSvc.get('messages');

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
            var report = {};

            _.each(userVotes, function(voteItem) {
                var userItem = UserSvc.getUser(voteItem.socketId);
                if (userItem) {
                    if (_.isEqual(voteItem.vote, 'abstain')) {
                        voteItem.vote = 'X';
                    } else if (_.isEqual(voteItem.vote, 'unknown')) {
                        voteItem.vote = '?';
                    }
                    userItem.set('vote', voteItem.vote);

                    if (_.isUndefined(report[voteItem.vote])) {
                        report[voteItem.vote] = 1;
                    } else {
                        report[voteItem.vote]++;
                    }
                }
            });

            // build the report message
            var reportSize = _.size(report);
            var isConsensus = reportSize === 1 ? true : false;
            var consensusVote = 0;

            if (isConsensus) {
                _.each(report, function(item, vote) {
                    consensusVote = vote;
                });
            }

            addChatMessage({
                username: 'Vote Report' + (RoomSvc.get('topic') ? ': ' + RoomSvc.get('topic') : ''),
                message: '',
                report: report,
                isConsensus: isConsensus,
                consensusVote: consensusVote
            });
        }

        // Input chat message
        function addChatMessage(data) {
            $scope.messages.push(data);
            $scope.$apply();

            $('#chat-container').scrollTop($('#chat-container').prop('scrollHeight'));
        }
    }
]);
