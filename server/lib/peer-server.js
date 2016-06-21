var PeerServer = require('peer').PeerServer;

// PeerJS Server
module.exports = function PeerServerInstance(port, path) {
    this.server = PeerServer({
        port: port,
        path: path,
        proxied: true
    });

    this.server.on('connection', function(id) {
        debug.log('Peer Connected: ' + id, 'gray');
    });

    this.server.on('disconnect', function(id) {
        debug.log('Peer Disconnected: ' + id, 'gray');
    });

    return this;
};
