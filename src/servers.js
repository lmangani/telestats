const dgram = require('dgram');
const net = require('net');
const log = require('./logger');
const bucket_emitter = require('./bulk-emitter');
const mysql = require('mysql');

var last = [];
var query, conn;
var config;

var check = function(set){

}

init = function(config){
	log('%start:green Initializing MySQL connection...');	
	conn = mysql.createConnection(config.mysql.dbOpts);
	conn.connect();

	log('%start:green Initializing Bulk bucket...');
	bucket = bucket_emitter.create(config.queue||{});
	bucket.on('data', function(data) {
	  // Bulk ready to emit!
	  try {
	    if (config.debug) log('%data:cyan BULK Out!');
	    if (config.mysql.debug) log('%data:cyan BULK Set: %s:blue', JSON.stringify(data) );
	    /// DO INSERT
	    var values = [];
	    var methods = [];
	    data.forEach(function(row){
		if (config.mysql.debug) log('%data:cyan ROW: %s:blue', JSON.stringify(row) );
		if (row.name && row.fields && (row.tags.method||row.tags.code) && config.stats.method ){

			var total = row.fields[config.stats.gauge] || row.fields[config.stats.counter] || 0;
			var metric = row.tags.method || row.tags.code;
			var pair = metric + "_" + row.tags.response || '';

			if (config.stats.subtotal && row.fields[config.stats.counter] ){
				if (last[pair]) { 
					var tmp = total - last[pair];  
					if(tmp < 0) { 
					   total = 0; 
					} else {
					   total = tmp;
					}
					last[pair] = total;
				} else { last[pair] = total || 0; }
			}

			var insert = [ new Date(row.timestamp - 30000), new Date(row.timestamp), metric, row.tags.response || '', total ]; 
			methods.push(insert);

		} else if (row.name && row.fields && config.stats.data ){

			var total = row.fields[config.stats.gauge] || row.fields[config.stats.counter] || 0;
			var metric = row.name;

			if (config.stats.subtotal && row.fields[config.stats.counter]){
				if (last[metric]) { 
					var tmp = total - last[metric]; 
					
					if(tmp<0) { 
						total = 0; 
					} else {
						total = tmp;
					}
					last[metric] = total; 
				} else { last[metric] = total || 0; }
			}

			var insert = [ new Date(row.timestamp - 30000), new Date(row.timestamp), metric, total];
			values.push(insert);
		}
	    });
	    query  = "INSERT IGNORE INTO stats_data (from_date, to_date, type, total) VALUES ?";
	    if(values.length > 0 && config.stats.data){
		  if (config.mysql.debug) log('%data:cyan INSERT: %s:blue', query, values );
		  conn.query(query, [values], function(err) {
		    if (err) throw err;
		    //conn.end();
		  });
	    }
	    query = "INSERT IGNORE INTO stats_method (from_date, to_date, method, totag, total) VALUES ?"
	    if(methods.length > 0 && query && config.stats.method){
		  if (config.mysql.debug) log('%data:cyan INSERT: %s:blue', query, methods );
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
