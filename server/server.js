var environment = 'dev';

var Q = require('q');
var app = require('express')();
var https = require('https');
var cheerio = require('cheerio');
var $ = '';
var http = require('http');
var httpServer = http.Server(app);
var io = require('socket.io')(httpServer, {path: '/socket/socket.io'});
var _ = require('underscore');
var moment = require('moment');
var debug = require('./lib/debug')(environment);
var db = require('./lib/db')();
var config = require('./config.json');

// Port which the HTTP Server listens for socket connections
var httpPort = 3006;
// Port which peerjs listens for connections
var peerPort = 9001;

// PeerJS Server
var PeerServer = require('./lib/peer-server')(peerPort, '/poker');

var Rooms = require('./lib/rooms')();
var Users = require('./lib/users')();

io.on('connection', function(socket) {
    var user,
        room;

    // Setup the user
    user = Users.createUser(socket.id);

    if (!_.isUndefined(socket.handshake.query.username)) {
        // Set the username
        user.set('username', socket.handshake.query.username);
    }

    if (!_.isUndefined(socket.handshake.query.room)) {
        // Join the room
        joinRoom(socket.handshake.query.room);
    }

    // user sends a message
    socket.on('message:send', function(message) {
        if (_.isEmpty(message)) {
            return;
        }

        debug.log(
            user.get('username') + ':', 'white',
            message, 'cyan'
        );

        // add message to room history
        room.addMessage(user.get('username'), message);

        io.to(room.get('name')).emit('message:receive', {
            username: user.get('username'),
            message: message
        });
    });

    // the user only wants to spectate
    socket.on('user:spectator', function(isSpectator) {
        if (isSpectator) {
            user.set('spectator', true);

            io.to(user.get('room')).emit('user:reload', buildUserObj({
                spectator: user.get('spectator')
            }));

            debug.log(
                room.get('name') + ':', 'cyan',
                user.get('username'), 'white',
                'is now a spectator', 'magenta'
            );
        }
    });

    // set the webcam state of the user
    socket.on('user:call', function(data) {
        if (!_.isUndefined(data)) {
            if (data.active) {
                // call is active
                user.set('activeCall', true);
                if (data.video) {
                    user.set('activeWebcam', true);
                }
            } else {
                // call is not active
                user.set('activeCall', false);
                user.set('activeWebcam', false);
            }

            socket.broadcast.to(room.get('name')).emit('user:reload', buildUserObj({
                activeWebcam: user.get('activeWebcam'),
                activeCall: user.get('activeCall')
            }));
        }
    });

    // set the microphone state of the user
    socket.on('user:microphone', function(data) {
        if (!_.isUndefined(data)) {
            if (data.muted) {
                // microphone is muted
                user.set('muted', true);
            } else {
                // microphone is unmuted
                user.set('muted', false);
            }

            socket.broadcast.to(room.get('name')).emit('user:reload', buildUserObj({
                muted: user.get('muted')
            }));
        }
    });

    // Set the timer countdown
    socket.on('timer:countdown', function(countdown) {
        room.set('countdown', countdown);
        // reload countdown
        io.to(room.get('name')).emit('room:reload', {
            countdown: room.get('countdown')
        });
        // alert others in room of new countdown
        socket.broadcast.to(room.get('name')).emit('timer:countdown', {
            countdown: room.get('countdown')
        });

        debug.log(room.get('name') + ': New countdown is', 'cyan', room.get('countdown'), 'magenta', 'seconds', 'cyan');
    });

    // Start the timer in the room
    socket.on('timer:start', function() {
        socket.broadcast.to(room.get('name')).emit('timer:start');
        room.set('activeCountdown', true);
        io.to(room.get('name')).emit('room:reload', {
            activeCountdown: room.get('activeCountdown')
        });
    });

    // Stop the timer in the room
    socket.on('timer:stop', function() {
        socket.broadcast.to(room.get('name')).emit('timer:stop');
        room.set('activeCountdown', false);
        io.to(room.get('name')).emit('room:reload', {
            activeCountdown: room.get('activeCountdown')
        });
    });

    // Start the timer in the room
    socket.on('timer:reset', function() {
        socket.broadcast.to(room.get('name')).emit('timer:reset');
        room.set('activeCountdown', false);
        io.to(room.get('name')).emit('room:reload', {
            activeCountdown: room.get('activeCountdown')
        });
    });

    // Fetch the current timer time from a user
    socket.on('timer:fetch', function() {
        var usersInRoom = Users.getUsersInRoom(room.get('name'));
        var hasRequested = false;

        _.each(usersInRoom, function(u) {
            if (!_.isEqual(u.get('socketId'), user.get('socketId')) && !hasRequested) {
                socket.to(u.get('socketId')).emit('timer:fetch', user.get('socketId'));
                hasRequested = true;
            }
        });
    });

    // User relays timer value back to requester
    socket.on('timer:value', function(data) {
        socket.to(data.requester).emit('timer:value', data.value);
    });

    // When a user elects to reveal all votes regardless of voting status
    socket.on('vote:reveal', function() {
        // set the room to voting ended
        room.set('activeVote', false);
        io.to(room.get('name')).emit('room:reload', {
            activeVote: room.get('activeVote')
        });
        // Send all votes to the users in the channel
        io.to(room.get('name')).emit('vote:end', getUserVotes());
    });

    // When voting needs to be reset
    socket.on('vote:reset', function() {
        // reset all voting for users in the room
        var usersInRoom = Users.getUsersInRoom(room.get('name'));

        _.each(usersInRoom, function(u) {
            u.set('vote', null);
            u.set('hasVoted', false);
        });

        // alert other users in channel to reset their votes
        socket.broadcast.to(room.get('name')).emit('vote:reset');
    });

    // When a user casts their vote
    socket.on('vote:cast', function(vote) {
        // only cast a vote if the room is actively voting
        if (room.get('activeVote')) {
            user.set('vote', vote);
            user.set('hasVoted', true);

            // Save the vote
            Q.when(db.castVote({
                vote_session_id: room.get('voteSession'),
                username: user.get('username'),
                vote: user.get('vote')
            })).then(function(result) {

            });
            // alert others in room of their vote (exclude the actual vote until voting ends)
            socket.broadcast.to(user.get('room')).emit('user:reload', buildUserObj({
                hasVoted: user.get('hasVoted')
            }));

            // Debug the vote
            debug.log(room.get('name') + ': ' + user.get('username') + ' voted: ' + user.get('vote'), 'green');

            // Check if everyone in the room has voted
            var allVotesCast = true,
                usersInRoom = Users.getUsersInRoom(room.get('name'));

            _.each(usersInRoom, function(u) {
                // Only count a user for voting if they aren't a spectator
                if (!u.get('hasVoted') && !u.get('spectator')) {
                    allVotesCast = false;
                }
            });

            if (allVotesCast) {
                debug.log(room.get('name') + ': All votes have been cast', 'green');
                // set the room to voting ended
                room.set('activeVote', false);
                // reset the vote session
                room.set('voteSession', 0);

                io.to(room.get('name')).emit('room:reload', {
                    activeVote: room.get('activeVote')
                });
                // Send all votes to the users in the channel
                io.to(room.get('name')).emit('vote:end', getUserVotes());
                debug.log(room.get('name') + ': Voting has ended', 'green');
            }
        }
    });

    // When a user calls for a vote
    socket.on('vote:start', function() {
        Q.when(db.createSession({
            room: room.get('name'),
            topic: room.get('topic')
        })).then(function(result) {
            room.set('voteSession', result.insertId);
            debug.log('Voting Session:', 'cyan', room.get('voteSession'), 'magenta');

            // start a vote in the room
            room.set('activeVote', true);
            io.to(room.get('name')).emit('room:reload', {
                activeVote: room.get('activeVote')
            });
            // reset all users votes
            var usersInRoom = Users.getUsersInRoom(room.get('name'));
            _.each(usersInRoom, function(u) {
                u.set('vote', null);
                u.set('hasVoted', false);
            })
            // start a vote for all users in the channel
            socket.broadcast.to(room.get('name')).emit('vote:start');
            debug.log(room.get('name') + ': Voting has started', 'yellow');
        });
    });

    // When a user changes the topic
    socket.on('topic:change', function(topic) {
        // change the topic in the room class
        room.set('topic', topic);
        // alert users in the room of the new topic
        socket.to(room.get('name')).emit('room:reload', {
            topic: topic
        });
    });

    // When the topic is finished, attempt fetching ticket data
    socket.on('ticket:fetch', function() {
        if (_.isEmpty(config.jiraCookie)) {
            debug.log('JIRA Cookie cannot be empty', 'red');
            return;
        }

        var post_options = {
            host: config.jiraHost,
            port: config.jiraPort,
            path: config.jiraPath + room.get('topic'),
            method: 'GET',
            headers: {
                'Cookie': config.jiraCookie
            }
        };

        // Set up the request
        var post_req = https.request(post_options, function(res) {
            var data = '';
            res.setEncoding('utf8');

            res.on('data', function(chunk) {
                data += chunk;
            });

            res.on('end', function() {
                $ = cheerio.load(data);
                var summary = $('#summary-val').text();
                debug.log(summary, 'cyan');
                data = '';

                room.set('topicData', {
                    summary: summary
                });

                io.in(room.get('name')).emit('room:reload', {
                    topicData: room.get('topicData')
                });
            });

        });

        post_req.end();
    });

    // When a user requests voting history
    socket.on('history:get', function() {
        Q.when(db.getHistory(room.get('name'))).then(function(results) {
            socket.emit('history:get', results);
        });

        debug.log(user.get('username'), 'cyan', 'is fetching history', 'yellow');
    });

    // When a user disconnects
    socket.on('disconnect', function() {
        var removeResult = Users.removeUser(socket.id);

        if (!removeResult) {
            debug.log(user.get('username') + ' was not removed from the user list...', 'red');
        }

        // tell everyone that this person left the group
        io.in(user.get('room')).emit('user:disconnected', user.get('socketId'));
        debug.log(room.get('name') + ': ' + user.get('username') + ' has disconnected', 'yellow');

        var usersInRoom = Users.getUsersInRoom(room.get('name'));
        if (usersInRoom.length <= 0) {
            // no one is left in the room, remove it
            debug.log('Removing room: ' + room.get('name'), 'cyan');
            Rooms.removeRoom(room.get('name'));
        }
    });

    // Return the user votes
    function getUserVotes() {
        var userVotes = [],
            usersInRoom = Users.getUsersInRoom(room.get('name'));

        _.each(usersInRoom, function(u) {
            userVotes.push({
                socketId: u.get('socketId'),
                vote: u.get('vote')
            });
        });

        return userVotes;
    }

    // Build an object that automatically includes the users socketId
    function buildUserObj(obj) {
        var tmpObj = obj;
        // include users socketId
        tmpObj.socketId = user.get('socketId');

        return tmpObj;
    }

    // A new user joins a room
    function joinRoom(roomId) {
        roomId = roomId.toLowerCase();
        room = Rooms.createOrGetRoom(roomId);
        socket.join(room.get('name'));
        user.set('room', roomId);
        // Retrieve all users from the room
        var usersInRoom = Users.getUsersInRoom(roomId, {
            dataOnly: true
        });

        io.to(socket.id).emit('join:success', {
            users: usersInRoom,
            room: room.data()
        });
        socket.to(room.get('name')).emit('user:join', user.data());

        debug.log(room.get('name') + ': ' + user.get('username') + ' has joined', 'green');
        debug.log(Users.users.length, 'magenta', 'total users connected', 'cyan');
    }
});

// Start the HTTP server to listen for incoming socket connections
httpServer.listen(httpPort, function() {
    console.log('listening on *:' + httpPort);
});
