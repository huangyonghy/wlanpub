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
    async   = require('async'),
    isJSON  = require('is-json'),
    digest  = require('./lib/digest'),
    user    = require('./lib/user'),
    connectionModel = require('./models/connectionModel');

var memoryConfig;
var heapdump;
var memwatch;
if(process.platform == 'linux')
{
    memoryConfig = require('./lib/memory').memoryConfig;
    heapdump = require('./lib/memory').heapdump;
    memwatch = require('./lib/memory').memwatch;
}

module.exports = {
    "config"  : config,
    "log4js"  : log4js,
    "log4jsConfig" : log4jsConfig,
    "basic"   : basic,
    "mqhd"    : mqoper,
    "dbhd"    : dboper,
    "monitor" : monitor,
    "connectionModel" : connectionModel,
    "memoryConfig" : memoryConfig,
    "heapdump" : heapdump,
    "memwatch" : memwatch,
    "async"    : async,
    "isJSON"   : isJSON,
    "digest"   : digest,
    "user"     : user
};
