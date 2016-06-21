var User;

app.service('UserSvc', ['$rootScope',
    function($rootScope) {
        var userSvc = {};

        // All users
        userSvc.users = [];
        // Local user
        userSvc.user;
        // Local Socket ID
        userSvc.socketId;

        // Mimic get/set for the room class
        userSvc.get = function(key) {
            return userSvc.user.get(key);
        };

        userSvc.set = function(key, val) {
            return userSvc.user.set(key, val);
        };

        // Retrieve a single user
        userSvc.getUser = function(socketId, skipApply) {
            var userItem;
            _.each(userSvc.users, function(user) {
                if (user.get('socketId') === socketId) {
                    userItem = user;
                    if (typeof(skipApply) === 'undefined' || skipApply === false) {
                        $rootScope.$apply();
                    }
                }
            });

            return userItem;
        };

        // Add a single user to the user list
        userSvc.addUser = function(userData) {
            var user = new User(userData);
            userSvc.users.push(user);
        };

        // Add multiple users to the user list
        userSvc.addUsers = function(usersData) {
            _.each(usersData, function(data) {
                var user = new User(data);
                userSvc.users.push(user);
            });
            $rootScope.$apply();
        };

        // Set the local user
        userSvc.setLocalUser = function(socketId) {
            _.each(userSvc.users, function(user) {
                if (user.get('socketId') === socketId) {
                    userSvc.user = user;
                }
            });
        };

        // Clear all users
        userSvc.clearUsers = function() {
            userSvc.users = [];
            //$rootScope.$apply();
            debug.log('All users cleared');
        };

        /**
         * User Class
         *
         * used to maintain user details
         * @param {Object} data initial details to store about the user (derived from Socket Server user class)
         */
        User = function(data) {
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
                            'please add it to the Socket Server User Class');
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

        return userSvc;
    }
]);
