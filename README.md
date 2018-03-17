# telestats
Telestats is a single-purpose [Telegraf](https://github.com/influxdata/telegraf) JSON socket receiver emulating the HOMER 5 Stats insert model for [heplify-server](https://github.com/sipcapture/heplify-server) prometheus metric aggregations.

### Pipeline
```
[HEPLIFY]{promstats} <--pull-- [TELEGRAF]{aggs} --push--> [TELESTATS]{mysql}
```

## Notes
Bundles only - Don't use this! 

#### Usage
```
telestats -c ./config.js
```

#### Options
see `config.js`

----

##### Telegraf Config
```
# Telegraf configuration

[global_tags]
  # dc = "us-east-1" # will tag all metrics with dc=us-east-1
  # rack = "1a"

# Configuration for telegraf agent
[agent]
  ## Default data collection interval for all inputs
  interval = "30s"
  ## Rounds collection interval to 'interval'
  ## ie, if interval="10s" then always collect on :00, :10, :20, etc.
  round_interval = true

  ## Telegraf will cache metric_buffer_limit metrics for each output, and will
  ## flush this buffer on a successful write.
  metric_buffer_limit = 10000
  ## Flush the buffer whenever full, regardless of flush_interval.
  flush_buffer_when_full = true

  ## Collection jitter is used to jitter the collection by a random amount.
  ## Each plugin will sleep for a random time within jitter before collecting.
  ## This can be used to avoid many plugins querying things like sysfs at the
  ## same time, which can have a measurable effect on the system.
  collection_jitter = "0s"

  ## Default flushing interval for all outputs. You shouldn't set this below
  ## interval. Maximum flush_interval will be flush_interval + flush_jitter
  flush_interval = "30s"
  ## Jitter the flush interval by a random amount. This is primarily to avoid
  ## large write spikes for users running a large number of telegraf instances.
  ## ie, a jitter of 5s and interval 10s means flushes will happen every 10-15s
  flush_jitter = "0s"

  ## Run telegraf in debug mode
  debug = false
  ## Run telegraf in quiet mode
  quiet = true
  ## Override default hostname, if empty use os.Hostname()
  hostname = ""

###############################################################################
#                                  OUTPUTS                                    #
###############################################################################

[[outputs.socket_writer]]
  #Node JS udp or tcp socket
  address = "udp://telestats:8094"
  # keep_alive_period = "5m"
  data_format = "json"
  json_timestamp_units = "1ms"

###############################################################################
#                                  AGGREGATIONS                               #
###############################################################################

[[aggregators.basicstats]]
  ## General Aggregator Arguments:
  ## The period on which to flush & clear the aggregator.
  period = "30s"
  ## If true, the original metric will be dropped by the
  ## aggregator and will not get sent to the output plugins.
  drop_original = true

###############################################################################
#                                  INPUTS                                     #
###############################################################################

[[inputs.prometheus]]
 ## An array of urls to scrape metrics from.
 urls = ["http://heplify:9999/metrics"]
 ```
