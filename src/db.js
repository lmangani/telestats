const mysql = require('mysql2/promise')
const config = require('./config').getConfig();

module.exports = () => {
	return mysql.createConnection(config.mysql.dbOpts)
}
