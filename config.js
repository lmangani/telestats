{
  "id" : "HEPLIFY-stats-001",
  "socket": "udp",
  "port": 8094,
  "address": "127.0.0.1",
  "mysql": {
    "debug": false,
    "dbOpts": {
        "host": "localhost",
        "user": "homer_user",
        "password": "homer_password",
        "database": "stats_data"
    },
    "maxRows": 1000
  },
  "stats" : {
	"data" : false,
	"method" : true,
	"gauge" : "gauge_count", // _count, _max, _mean, _min
	"counter" : "counter_count" // _count, _max, _mean, _min
  },
  "debug": true
}
