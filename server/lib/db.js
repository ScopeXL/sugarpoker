var Q = require('q');
var _ = require('underscore');
var moment = require('moment');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(__dirname + '/db/db.sqlite3');

// Tables/Columns
var tables = {
    'vote_session': [
        {name: 'id', type: 'INTEGER PRIMARY KEY'},
        {name: 'timestamp', type: 'INTEGER'},
        {name: 'room', type: 'TEXT'}
    ],
    'votes': [
        {name: 'id', type: 'INTEGER PRIMARY KEY'},
        {name: 'id_vote_session', type: 'INTEGER'},
        {name: 'vote', type: 'INTEGER'}
    ]
};

module.exports = function DB() {
    // clear all previous DB data
    dropTables();

    // create the database tables
    createTables();

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

    return this;
};

// drop tables
function dropTables() {
    db.serialize(function() {
        _.each(tables, function(cols, table) {
            db.run('DROP TABLE IF EXISTS ' + table);
        });
    });
}

// create tables
function createTables() {
    db.serialize(function() {
        _.each(tables, function(cols, table) {
            db.run('CREATE TABLE ' + table + ' (' + columns(cols) + ')');
        });

        /*var stmt = db.prepare('INSERT INTO votes VALUES (?, ?)');
        for (var i = 0; i < 10; i++) {
            stmt.run(i, 5);
        }
        stmt.finalize();

        db.each('SELECT rowid AS id, vote FROM votes', function(err, row) {
            console.log(row.id + ': ' + row.vote);
        });*/
    });
    //db.close();
}

/**
 * Create new column string when creating new tables
 *
 * @param {Array} cols Array of objects of columns {name: 'id', type: 'INT'}
 * @return {String}
 */
function columns(cols) {
    return cols.map(function(elem) {
        return elem.name + ' ' + elem.type;
    }).join(', ');
}
