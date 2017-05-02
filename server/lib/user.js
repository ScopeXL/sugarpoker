var _ = require('underscore');

// User class
module.exports = function User(socketId) {
    // store user details
    this.details = {
        // always store the socket ID to be able to look up
        socketId: cleanSocketId(socketId, 'client'),
        // store the server socketId (since it stores the namespace as well)
        serverSocketId: cleanSocketId(socketId, 'server'),
        // the username of the client
        username: null,
        // the room they are located
        room: null,
        // are they the owner of the room
        roomOwner: false,
        // their vote
        vote: null,
        // have they voted
        hasVoted: false,
        // the user has an active call
        activeCall: false,
        // the user has an active webcam session
        activeWebcam: false,
        // the user has muted their microphone
        muted: true,
        // the user is in spectator mode which they won't be called to vote
        spectator: false
    };

    // get a variable from the user details
    this.get = function(setting) {
        if (!_.isUndefined(this.details[setting])) {
            return this.details[setting];
        }

        return null;
    };

    // set a variable in the user details
    this.set = function(setting, value) {
        // do not allow null or undefined setting
        if (_.isUndefined(setting) || _.isNull(setting)) {
            return false;
        }

        // do not allow undefined values
        if (_.isUndefined(value)) {
            value = null;
        }
        this.details[setting] = value;
        return true;
    };

    // return user data
    this.data = function() {
        //var tmpDetails = _.clone(this.details);
        var tmpDetails = this.details;

        return tmpDetails;
    };

    // Pause video playback
    this.pausePlayback = function() {
        console.log('PLAYBACK PAUSED!!');
    };

    return this;
};

// Clean the socket ID of th user by removing the server prefix
function cleanSocketId(socketId, type) {
    switch (type) {
        case 'client':
            if (!_.isUndefined(socketId)) {
                if (_.isEqual(socketId.substring(0, 2), '/#')) {
                    return socketId.substring(2);
                } else {
                    return socketId;
                }
            }
            break;
        case 'server':
            if (!_.isUndefined(socketId)) {
                if (_.isEqual(socketId.substring(0, 2), '/#')) {
                    return socketId;
                } else {
                    return '/#' + socketId;
                }
            }
            break;
    }

    return null;
}
