const dgram = require('dgram');
const net = require('net');
const log = require('./logger');
const bucket_emitter = require('./bulk-emitter');
const mysql = require('mysql');

var query, conn;
var config;

init = function(config){
	log('%start:green Initializing MySQL connection...');	
	conn = mysql.createConnection(config.mysql.dbOpts);
	conn.connect();

	log('%start:green Initializing Bulk bucket...');
	bucket = bucket_emitter.create(config.queue||{});
	bucket.on('data', function(data) {
	  // Bulk ready to emit!
	  try {
	    if (config.debug) log('%data:cyan BULK Out: %s:blue', JSON.stringify(data) );
	    /// DO INSERT
	    var values = [];
	    var methods = [];
	    data.forEach(function(row){
		if (config.debug) log('%data:cyan ROW: %s:blue', JSON.stringify(row) );
		if (row.name && row.fields && (row.tags.method||row.tags.code) ){
			var insert = [ new Date(row.timestamp - 30000), new Date(row.timestamp), row.tags.method || row.tags.code, row.tags.response || row.tags.host, row.fields.gauge_count || row.fields.counter_count || 0 ]; 
			methods.push(insert);

		} else if (row.name && row.fields){
			var insert = [ new Date(row.timestamp - 30000), new Date(row.timestamp), row.name, row.fields.gauge_count || row.fields.counter_count || 0];
			values.push(insert);
		}
	    });
	    query  = "INSERT IGNORE INTO stats_data (from_date, to_date, type, total) VALUES ?";
	    if(values.length > 0 && query){
		  if (config.debug) log('%data:cyan INSERT: %s:blue', query, values );
		  conn.query(query, [values], function(err) {
		    if (err) throw err;
		    //conn.end();
		  });
	    }
	    query = "INSERT IGNORE INTO stats_method (from_date, to_date, method, totag, total) VALUES ?"
	    if(methods.length > 0 && query){
		  if (config.debug) log('%data:cyan INSERT: %s:blue', query, methods );
	  	  conn.query(query, [methods], function(err) {
	  	    if (err) throw err;
	  	    //conn.end();
	  	  });
	    }
	  } catch(err) { log('%data:red ERROR: %s',err); }
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
		self[config.socket](inject_config);
	},

	tcp: function({ port = undefined, address = '127.0.0.1' } = { address: '127.0.0.1' }) {
	  let server = net.createServer()

	  server.on('error', (err) => log('%error:red %s', err.toString()))
	  server.on('listening', () => log('%start:green TCP %s:gray %d:yellow', server.address().address, server.address().port))
	  server.on('close', () => log('%stop:red %s:gray %d:yellow', server.address().address, server.address().port))
	  server.on('connection', (socket) => {
	    log('%connect:green (%s:italic:dim %d:italic:gray)', socket.remoteAddress, socket.remotePort)

	    socket.on('data', (data) => bucket.push(JSON.parse(data.toString())))
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
	        bucket.push(JSON.parse(message.toString()));
	  })

	  socket.bind(port, address)
	}


}
