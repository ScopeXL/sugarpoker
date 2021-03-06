var Q = require('q');
var _ = require('underscore');
var moment = require('moment');
var mysql = require('mysql');
var fs = require('fs');
var config = require('../config');

var pool = mysql.createPool({
    multipleStatements: true,
    connectionLimit: 10,
    host: config.db_host,
    user: config.db_user,
    password: config.db_pass,
    database: config.db_database
});

module.exports = function DB() {

    // Create a voting session
    this.createSession = function(data) {
        var deferred = Q.defer();

        pool.query('INSERT INTO vote_session SET ?', data, _.bind(function(err, result) {
            if (err) {
                throw err;
                // deferred.reject(err);
                // return deferred.promise;
            }

            deferred.resolve(result);
        }), this);

        return deferred.promise;
    };

    // Cast a vote
    this.castVote = function(data) {
        var deferred = Q.defer();

        pool.query('INSERT INTO votes SET ?', data, _.bind(function(err, result) {
            if (err) {
                throw err;
                // deferred.reject(err);
                // return deferred.promise;
            }

            deferred.resolve(result);
        }), this);

        return deferred.promise;
    };

    // Cast a vote
    this.getHistory = function(roomName) {
        var deferred = Q.defer();

        pool.query('SELECT * FROM vote_session ' +
            'JOIN votes ON vote_session.id = votes.vote_session_id ' +
            'WHERE vote_session.room = ? ' +
            'ORDER BY vote_session.timestamp DESC, votes.vote_timestamp ASC',
            roomName, _.bind(function(err, rows, fields) {
                if (err) {
                    throw err;
                }

                // Make new object array to send back without duplicate usernames
                var sessions = {};

                _.each(rows, function(row) {
                    var id = row.vote_session_id;
                    if (_.isUndefined(sessions[id])) {
                        sessions[id] = {
                            id: row.vote_session_id,
                            room: row.room,
                            topic: row.topic,
                            timestamp: row.timestamp,
                            datetime: moment(row.timestamp).format('MM/DD/YYYY hh:mm:ss A'),
                            unixstamp: moment(row.timestamp).format('X'),
                            users: {}
                        };
                    }

                    // Overwrite the session ID username in case the user has multiple changed votes
                    sessions[id].users[row.username] = row;
                });

                sessions = _.sortBy(sessions, function(o) { return -o.unixstamp; })
                
                // console.log(sessions);
                deferred.resolve(sessions);
            }, this)
        );

        return deferred.promise;
    };

    // Create Database if not exists
    this.createDatabase = function() {
        // Open file to insert
        fs.readFile(__dirname + '/sugarpoker.sql', 'utf8', function(err, data) {
            if (err) {
                throw err;
            }

            pool.query(data, function(err, result) {
                if (err) {
                    throw err;
                }
            });
        });
    };

    this.newVotingSession = function(room) {
        var deferred = Q.defer();
        var stmt = db.prepare('INSERT INTO vote_session (timestamp, room) VALUES (?, ?)');

        stmt.run(moment().unix(), room);
        stmt.finalize(function(err) {
            if (err) {
                debug.log(err, 'red');
                deferred.reject(err);
            } else {
                deferred.resolve(this.lastID);
            }
        });

        return deferred.promise;
    };

    // Insert test data
    /*var stmt = db.prepare('INSERT INTO vote_session (timestamp, room) VALUES (?, ?)');
    stmt.run(22, 'kabla');
    stmt.run(23, 'kabla2');
    stmt.finalize();*/

    // Create the database tables if they don't exist
    this.createDatabase();

    return this;
};
