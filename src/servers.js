const dgram = require('dgram');
const net = require('net');
const log = require('./logger');
const bucket_emitter = require('./bulk-emitter');
const mysql = require('./db.js');

var query;
var config;

init = function(config){
	log('%start:green Initializing Bulk bucket...');
	bucket = bucket_emitter.create(config.queue||{});
	bucket.on('data', function(data) {
	  // Bulk ready to emit!
	  if (config.debug) log('%data:cyan BULK Out [%s:blue]', JSON.stringify(data) );
	  /// DO INSERT
//	  mysql.query(mysql, [data], function(err) {
//	    if (err) throw err;
//	    conn.end();
//	  });

	}).on('error', function(err) {
	  log('%error:red %s', err.toString() )
	});
}

var self = module.exports = {

	headerFormat: function(headers) {
	  return Object.keys(headers).map(() => '%s:cyan: %s:yellow').join(' ')
	},

	select: function(inject_config){
		config = inject_config;
		if (config.debug) log('CONFIG: %s',config);
		init(config);
		query  = "INSERT INTO ("+config.mysql.query_columns+") VALUES ?";
		self[config.socket](inject_config);
	},

	tcp: function({ port = undefined, address = '127.0.0.1' } = { address: '127.0.0.1' }) {
	  let server = net.createServer()

	  server.on('error', (err) => log('%error:red %s', err.toString()))
	  server.on('listening', () => log('%start:green TCP %s:gray %d:yellow', server.address().address, server.address().port))
	  server.on('close', () => log('%stop:red %s:gray %d:yellow', server.address().address, server.address().port))
	  server.on('connection', (socket) => {
	    log('%connect:green (%s:italic:dim %d:italic:gray)', socket.remoteAddress, socket.remotePort)

	    socket.on('data', (data) => bucket.push(data.toString()))
	    socket.on('error', (err) => log('%error:red (%s:italic:dim %d:italic:gray) %s', socket.remoteAddress, socket.remotePort, err.toString()))
	    socket.on('end', () => log('%disconnect:red️ (%s:italic:dim %d:italic:gray)', socket.remoteAddress, socket.remotePort))
	  })
	  server.listen(port, address)
	},

        udp: function({ port = undefined, address = '127.0.0.1' } = { address: '127.0.0.1' }) {
	  var socket = dgram.createSocket('udp4')

	  socket.on('error', (err) => log('error %s:yellow', err.message))
	  socket.on('listening', () => log('%start:green UDP4 %s:gray %d:yellow', socket.address().address, socket.address().port))
	  socket.on('close', () => log('%stop:red %s:gray %d:yellow', socket.address().address, socket.address().port))

	  socket.on('message', (message) => {
	        bucket.push(message.toString());
	  })

	  socket.bind(port, address)
	}


}
