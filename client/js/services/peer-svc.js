app.service('PeerSvc', ['UserSvc', 'SocketSvc', '$rootScope',
    function(UserSvc, SocketSvc, $rootScope) {
        var peerSvc = {};

        // the peer object
        var peer;
        // the media object containing audio/video
        var mediaStream;

        // create a new peer
        peerSvc.createPeer = function(peerId) {
            if (_.isUndefined(peerId)) {
                // generate peer ID
                peer = new Peer({
                    host: 'sugar.roesch.io',
                    port: 443,
                    path: '/pokerpeer',
                    debug: 0//3
                });
            } else {
                // assign peer ID
                peer = new Peer(peerId, {
                    host: 'sugar.roesch.io',
                    port: 443,
                    path: '/pokerpeer',
                    debug: 0//3
                });
            }

            // initialize the peer events
            initPeerEvents();
        };

        // return the peer object
        peerSvc.getPeer = function() {
            return peer;
        };

        // Start a video/audio call with existing peers
        // Object options {video:true, audio:true}
        peerSvc.startCall = function(options) {
            debug.log('Started a call...');

            // get the media stream
            var getUserMedia = window.navigator && window.navigator.getUserMedia;
            if (!_.isUndefined(navigator.getUserMedia)) {
                getUserMedia = navigator.getUserMedia;
            } else if (!_.isUndefined(navigator.webkitGetUserMedia)) {
                getUserMedia = navigator.webkitGetUserMedia;
            } else if (!_.isUndefined(navigator.mozGetUserMedia)) {
                getUserMedia = navigator.mozGetUserMedia;
            }

            if (_.isUndefined(getUserMedia)) {
                // no getUserMedia method found
                debug.log('No viable method for getUserMedia was found, aborting call...');
                return;
            }

            getUserMedia(options, function(stream) {
                mediaStream = stream;
                muteMicrophone(true);
                // call existing peers
                callExistingPeers();

                // Alert connected users you have an active call
                SocketSvc.emit('user:call', {
                    active: true,
                    video: options.video,
                    audio: options.audio
                });

            }, function(err) {
                debug.log('Failed to get local stream', err);
            });
        };

        // End a video/audio call with existing peers
        peerSvc.endCall = function() {
            debug.log('Ended a call...');
            var tracks = mediaStream.getTracks();
            _.each(tracks, function(track) {
                track.stop();
            });

            // Alert connected users you no longer have an active call
            SocketSvc.emit('user:call', {
                active: false
            });

            mediaStream = undefined;
        };

        // Mute/unmute the users microphone
        peerSvc.muteMicrophone = function(mute) {
            muteMicrophone(mute);
        };

        // Mute/unmute microphone
        function muteMicrophone(mute) {
            var audioTracks = mediaStream.getAudioTracks();

            var user = UserSvc.getUser(UserSvc.socketId, true);
            if (mute && audioTracks.length > 0) {
                // mute the microphone
                user.set('muted', true);

                _.each(audioTracks, function(track) {
                    track.enabled = false;
                });
                // Alert connected users you muted your microphone
                SocketSvc.emit('user:microphone', {
                    muted: true
                });
            } else if (!mute && audioTracks.length > 0) {
                // unmute the microphone
                user.set('muted', false);

                _.each(audioTracks, function(track) {
                    track.enabled = true;
                });
                // Alert connected users you unmuted your microphone
                SocketSvc.emit('user:microphone', {
                    muted: false
                });
            }
        }

        // Initialize peer events for the connected peer
        function initPeerEvents() {
            // Peer event on connect
            peer.on('open', function(id) {
                debug.log('Peer connection requested with ID: ' + id);

                // Connect to existing peers
                connectToExistingPeers();
            });

            // Peer has established a connection
            peer.on('connection', function(conn) {
                debug.log('Connection Received', conn);
                initConnectedPeerEvents(conn);
            });

            // Peer has received a call from another user
            peer.on('call', function(call) {
                debug.log('Call Details', call);
                // answer the call
                if (_.isUndefined(mediaStream)) {
                    debug.log('Answering the call without our mediaStream');
                    // Do not provide our media stream unless one exists
                    call.answer();
                } else {
                    debug.log('Answering the call with our mediaStream');
                    // Answer the call, providing our mediaStream
                    call.answer(mediaStream);
                }

                call.on('stream', function(remoteStream) {
                    debug.log('Remote stream received');
                    // Show stream in some video/canvas element.
                    var video = document.querySelector('video#video-' + call.peer);
                    video.srcObject = remoteStream;
                });
            });
        }

        $rootScope.$on('user:connected', function(e, remoteSocketId) {
            //connectToNewPeer(user.get('socketId'));
            var user = UserSvc.getUser(UserSvc.socketId);
            if (user.get('activeWebcam')) {
                debug.log('A new user has connected and my webcam is active. Call the new user');
                // call the user
                var call = peer.call(remoteSocketId, mediaStream);
            }
        });

        // Call existing peers
        function callExistingPeers() {
            // first set the local video
            var video = document.querySelector('video#video-local');
            video.srcObject = mediaStream;

            _.each(UserSvc.users, function(user) {
                // do not connect to yourself
                if (!_.isEqual(UserSvc.socketId, user.get('socketId'))) {
                    debug.log('Attempting to call ' + user.get('username'));
                    // call the user
                    var call = peer.call(user.get('socketId'), mediaStream);
                }
            });
        }

        // Connect to existing peers
        function connectToExistingPeers() {
            _.each(UserSvc.users, function(user) {
                // do not connect to yourself
                if (!_.isEqual(UserSvc.socketId, user.get('socketId'))) {
                    debug.log('Connecting to peer: ' + user.get('username'));

                    // initialize the connection to the other peer
                    var conn = peer.connect(user.get('socketId'));
                    initConnectedPeerEvents(conn);
                }
            });
        }

        // Connect to existing peers
        function connectToNewPeer(peerId) {
            UserSvc.getUser(peerId, function(user) {
                debug.log('Connecting to peer: ' + user.get('username'));

                // initialize the connection to the other peer
                var conn = peer.connect(user.get('socketId'));
                initConnectedPeerEvents(conn);
            });
        }

        // Initialize the events when a peer connection is made to another user
        function initConnectedPeerEvents(conn) {
            conn.on('open', function() {
                debug.log('Connection opened...');
                // When data is received from a connected peer
                conn.on('data', function(data) {
                    debug.log('Received', data);
                });

                // send test message
                //conn.send('Hello!');
                //debug.log('Sent test message...');
            });
        }

        return peerSvc;
    }
]);
