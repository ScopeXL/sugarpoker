var _ = require('underscore');
var User = require('./user');
var Rooms = require('./rooms')();

// Multiple Rooms class
module.exports = function Users() {
    // store users
    this.users = [];

    // create a new user
    this.createUser = function(socketId, ipAddress) {
        var user = new User(socketId, ipAddress);
        this.users.push(user);

        return user;
    };

    // remove an existing user
    this.removeUser = function(socketId) {
        var user = this.getUser(socketId);

        if (!_.isUndefined(user)) {
            // user exists, proceed with removal
            this.users = _.without(this.users, user);
            return true;
        }

        return false;
    };

    // get a specific user
    this.getUser = function(socketId) {
        var user;
        _.each(this.users, function(u) {
            if (_.isEqual(u.get('socketId'), socketId)) {
                user = u;
            }
        });

        if (!_.isUndefined(user)) {
            return user;
        } else {
            debug.log('No user was found');
        }
    };

    // Return the users in a specific room
    this.getUsersInRoom = function(room, options) {
        // do not allow empty rooms
        if (_.isUndefined(room) || _.isEmpty(room)) {
            return false;
        }

        // iterate each user and add to return array if room matches
        var tmpUsers = [];
        _.each(this.users, function(user) {
            if (_.isEqual(room, user.get('room'))) {
                if (!_.isUndefined(options) && options.dataOnly) {
                    tmpUsers.push(user.data());
                } else {
                    tmpUsers.push(user);
                }
            }
        });

        return tmpUsers;
    };

    // Return users watching a specific video
    this.getUsersWatchingVideo = function(room, videoTitle) {
        // first get users currently in the room
        var tmpUsers = this.getUsersInRoom(room);

        // get users currently watching the same video
        var usersWatching = [];
        _.each(tmpUsers, function(user) {
            if (user.get('currentlyWatchingVideo') && _.isEqual(videoTitle, user.get('videoTitle'))) {
                usersWatching.push(user);
            }
        });

        return usersWatching;
    };

    // get all users
    this.getAllUsers = function() {
        return this.users;
    };

    return this;
};
