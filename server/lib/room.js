var _ = require('underscore');

// Room class
module.exports = function Room(roomName, socketId) {
    // store room details
    this.details = {
        // always store the room name to prevent duplicates
        name: roomName,
        // the room topic
        topic: '',
        // fetched topic data
        topicData: {},
        // the owner of the room
        owner: socketId,
        // the room is invite only
        inviteOnly: false,
        // active vote
        activeVote: false,
        // countdown timer in seconds
        countdown: 300,
        // countdown is active
        activeCountdown: false,
        // max messages to store
        maxMessages: 50,
        // messages (for history)
        messages: []
    };

    // return room data
    this.data = function() {
        //var tmpDetails = _.clone(this.details);
        var tmpDetails = this.details;

        return tmpDetails;
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

    // Add a message to the room history
    this.addMessage = function(username, message) {
        if (this.details.messages.length >= this.details.maxMessages) {
            this.details.messages.splice(0, 1);
        }

        this.details.messages.push({
            username: username,
            message: message
        });
    };

    return this;
};
