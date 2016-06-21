var _ = require('underscore');
var Room = require('./room');

// Multiple Rooms class
module.exports = function Rooms() {
    // store rooms
    this.rooms = [];

    // create or get an existing room
    this.createOrGetRoom = function(roomName, socketId) {
        if (_.isNull(roomName)) {
            return;
        }

        var room;

        // convert the room to lowercase
        roomName = roomName.toLowerCase();

        _.each(this.rooms, function(r) {
            if (_.isEqual(r.get('name'), roomName)) {
                room = r;
            }
        });

        if (!_.isUndefined(room)) {
            // room exists
            return room;
        }

        // room does not exist, add it
        room = new Room(roomName, socketId);
        this.rooms.push(room);

        return room;
    };

    // get a specific room
    this.getRoom = function(roomName) {
        if (_.isNull(roomName)) {
            debug.log('Attempted to get a null room', 'red');
            return;
        }

        var room;
        // convert the room to lowercase
        roomName = roomName.toLowerCase();

        _.each(this.rooms, function(r) {
            if (_.isEqual(r.get('name'), roomName)) {
                room = r;
            }
        });

        return room;
    };

    // remove an existing room
    this.removeRoom = function(roomName) {
        var room = this.getRoom(roomName);

        if (!_.isUndefined(room)) {
            // room exists, proceed with removal
            this.rooms = _.without(this.rooms, room);
            return true;
        }

        return false;
    };

    // get all rooms
    this.getAllRooms = function() {
        return this.rooms;
    };

    return this;
};
