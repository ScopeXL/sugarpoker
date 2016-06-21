var Room;

app.service('RoomSvc', ['$rootScope',
    function($rootScope) {
        var roomSvc = {};

        // Local users room
        roomSvc.room;

        // Initialize a room object when the user joins a room
        roomSvc.init = function(details) {
            roomSvc.room = new Room(details);
        };

        // Mimic get/set for the room class
        roomSvc.get = function(key) {
            return roomSvc.room.get(key);
        };

        roomSvc.set = function(key, val) {
            return roomSvc.room.set(key, val);
        };

        // Trigger a room reload of data
        roomSvc.reload = function(details) {
            roomSvc.room.reload(details);
            debug.log(roomSvc.room);
        };

        /**
         * Room Class
         *
         * used to maintain room details
         * @param {Object} data initial details to store about the room (derived from Socket Server user class)
         */
        Room = function(data) {
            var self = this;
            // store user details
            this.details = data;

            // reload the user object with new details
            this.reload = function(details) {
                // iterate each detail and overwrite the setting(s) passed
                _.each(details, function(detailValue, key) {
                    if (_.isUndefined(self.details[key])) {
                        // this setting does not exist in the user object already
                        console.warn('Setting: ' + key + ' does not exist, ' +
                            'please add it to the Socket Server Room Class');
                    }
                    // overwrite the setting with the specified value
                    self.set(key, detailValue);
                });
                $rootScope.$apply();
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

            return this;
        };

        return roomSvc;
    }
]);
