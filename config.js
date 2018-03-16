{
  "id" : "HEPLIFY-stats-001",
  "socket": "udp",
  "port": 8094,
  "address": "127.0.0.1",
  "mysql": {
    "query_columns": "from_date, to_date, type, total",
    "dbOpts": {
        "host": "localhost",
        "user": "homer_user",
        "password": "homer_password",
        "database": "stats_data"
    },
    "table": "table_name",
    "maxRows": 1000
  },
  "debug": true
}
