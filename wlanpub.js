/* *
 * Created by Juneja on 2015/9/9.
 *
 * Collect attributes and methods for public
 */
"use strict";

var config  = require('config'),
    log4js  = require('log4js'),
    log4jsConfig = require('./lib/logger'),
    basic   = require('./lib/basic'),
    mqoper  = require('./lib/mqoper'),
    dboper  = require('./lib/dboper'),
    monitor = require('./lib/monitor'),
    casauth = require('./lib/cas-authentication'),
    connectionModel = require('./models/connectionModel');

module.exports = {
    "config"  : config,
    "log4js"  : log4js,
    "log4jsConfig" : log4jsConfig,
    "basic"   : basic,
    "mqhd"    : mqoper,
    "dbhd"    : dboper,
    "monitor" : monitor,
    "casauth" : casauth,
    "connectionModel" : connectionModel
};
