var ranaly = require('node_ranaly');
var url    = require('url');
var os     = require('os');
var child_process = require('child_process');
var basic   = require('./basic.js');
var serName = require('./constants.js');

function Monitor() {
    this.client = null;
    this.redisClient = null;

    this._dbEntryKey = 'WLANMONIT';
    this._keyPrefix  = 'MONIT';
    this._cpuMemSampCnts = 100;
    this._cpuMemInterval = 1000*60; // ms
    this._redisKeyTtl    = 60*10;   // s

    this._setRedisPara = function (para) {
        redisPara.port = para.port;
        redisPara.host = para.host;
    };
    this._getRedisPara = function() {
        return redisPara;
    };

    this._getUsageInfo = function() {
        return  usageInfo;
    };
    this._getServiceInfo = function() {
        return serviceInfo;
    };

    var redisPara  = {
        'port' :  6379,
        'host' :  'h3crd-wlan18'
    };
    var usageInfo = {
        'cpuUsage' : '',
        'memUsage' : ''
    };
    var serviceInfo   = {
        'name'   : '',
        'ipv4'   : '',
        'pid'    : 0,
        'starttime': ''
    };
}

Monitor.prototype.createProcessStats = function (moduleName, redisPara) {
    if (redisPara != undefined) {
        this._setRedisPara(redisPara);
    }
    var para = this._getRedisPara();

    this.client = ranaly.createClient(para.port, para.host, this._keyPrefix);
    this.redisClient = ranaly.redisClient;

    /* 选择Redis数据库序号 1 */
    this.redisClient.select(1);

    this.redisClient.on('ready', function () {
        console.log((new Date()) + ' [MONIT]Connect to monitor for %s is ready.', moduleName);
        monitor._processStats(moduleName);
    });

    this.redisClient.on('error', function (err) {
        console.error('[MONIT]Failed to create monitor client for '+moduleName+': '+err.name+', '+err.message);
    });
};

/**
 * Statistical response information
 */
Monitor.prototype.accessStats = function(req, res, next){
    var pathname = url.parse(req.url).pathname;
    var arry = pathname.split('/');
    var name = arry[2];

    if (('web' == name) || ('ant' == name)) {
        name = arry[3];
    }
//    console.log('[MONIT]'+pathname+':'+name);

    if (('' != name) && (undefined != name)) {
        var isValidService = serName.bIsValidService(name, true);
        if (isValidService) {
            monitor._reqCount(name);

            res.on('finish', function() {
                if ( res.statusCode == 200 ) {
                    monitor._resCount(name);
                } else {
                    console.log('[MONIT]'+name+' response failed with status code: ' + res.statusCode);
                }
            });
        }
    }

    next();
};

Monitor.prototype._createRanalyClient = function (redisPort, redisIP) {
    if (typeof redisPort === 'object') {
        this.client = ranaly.createClient(redisPort, this._keyPrefix);
    } else {
        this.client = ranaly.createClient(redisPort, redisIP, this._keyPrefix);
    }
    this.redisClient = ranaly.redisClient;

    /* 选择Redis数据库序号 1 */
    this.redisClient.select(1);
};

//统计各个业务进程基本信息
Monitor.prototype._processStats =  function (serviceName) {
    var ip    = basic.getLocalIP('eth', 'ipv4');
    var pid   = process.pid;
    var instanceName = [os.hostname(), serviceName, pid].join(':');
    var serviceInfo = this._getServiceInfo();
    var usageInfo = this._getUsageInfo();
    var bIsWebserver = (serviceName == serName.serviceName.webserver) ? true : false;

    if ( !bIsWebserver && (!serName.bIsValidService(serviceName)) ) {
        return ;
    }

    serviceInfo.name   = serviceName;
    serviceInfo.ipv4   = ip;
    serviceInfo.status = "run";
    serviceInfo.pid    = pid;
    serviceInfo.starttime = Date().toString();

    process.on('uncaughtException', function(err) {
        serviceInfo.status = "error";
        console.error('[MONIT]Process '+serviceName+' caught exception: '+err);
    });

    process.on('beforeExit', function() {
        serviceInfo.status   = "exit";

        monitor.redisClient.srem([monitor._keyPrefix, serviceName].join(':'), instanceName);
    //    monitor._saveBasicInfo(instanceName, serviceInfo);
    });

    process.on('exit', function(code) {
        serviceInfo.status   = "exit";
        serviceInfo.exitCode = code;

        console.log('[MONIT]Process '+serviceName+' exit with code: '+code);
    });

    /* cpu mem */
    setInterval(function() {
    //    var cmd = 'ps -aux | grep '+name+'.js';
        var cmd = 'ps aux | grep -E \"^root\\s\+'+pid+'.*\"';
        var ch = child_process.exec(cmd, function(error, stdout, stderr) {
            var tmp = basic.trimSpaces(stdout).split(' ');
            usageInfo.cpuUsage=tmp[2];
            usageInfo.memUsage=tmp[3];
            monitor._saveUsageInfo(instanceName, usageInfo);
        });
    }, monitor._cpuMemInterval);

    // process basic info
    monitor._saveBasicInfo(instanceName, serviceInfo);
    setInterval(function() {
        monitor._saveBasicInfo(instanceName, serviceInfo);
    }, 1000*(monitor._redisKeyTtl - 30));
};

/**
 * Save business name to redis
 */
Monitor.prototype._saveBusiness = function(porName){
  //将索引值作为分数存入redis setlist中
    monitor.redisClient.zadd(this._dbEntryKey, serName['serviceIdx'][porName],
                serName['serviceName'][porName]);
};

Monitor.prototype._saveUsageInfo = function (instanceName, usageInfo) {
    var bucket  = [instanceName, 'USAGE'].join(':');
    var uselist = new this.client.DataList(bucket);
    var ranalyKey = [this._keyPrefix+'DATALIST', bucket].join(':');

    uselist.push(usageInfo, this._cpuMemSampCnts, function(err, len) {
        if (err) {
            console.log('[MONIT]Failed to save usage info: '+err);
        }
    });
    this.redisClient.expire(ranalyKey, this._redisKeyTtl);
};

/*
 *将获取到的基本信息存到redis数据库中去
 */
Monitor.prototype._saveBasicInfo = function(instanceName, serviceInfo){
    var instanceKey = [this._keyPrefix, instanceName].join(':');
    var serviceKey  = [this._keyPrefix, serviceInfo.name].join(':');

    // 存模块名
    monitor._saveBusiness(serviceInfo.name);

    // 存实例名
    this.redisClient.sadd(serviceKey, instanceName);
    this.redisClient.expire(serviceKey, this._redisKeyTtl);

    // 存基本信息，确保只存一份
    this.redisClient.spop(instanceKey);
    this.redisClient.sadd(instanceKey, JSON.stringify(serviceInfo));
    this.redisClient.expire(instanceKey, this._redisKeyTtl);
};

//根据业务名，统计该业务访问次数
Monitor.prototype._reqCount =  function (name) {
    var bucket = [name, 'REQ'].join(':');
    var reqcnt = new this.client.Amount(bucket);

    reqcnt.incr(1, function(err, total) {
        if (err) {
            console.error('[MONIT]Failed to increase request count.');
        }
    });
};

//根据业务名，统计server回应的成功数；
Monitor.prototype._resCount = function(name) {
    var bucket = [name, 'RES'].join(':');
    var rescnt = new this.client.Amount(bucket);

    rescnt.incr(1, function(err, total){
        if (err) {
            console.error('[MONIT]Failed to increase response count.');
        }
    });
};

var monitor = module.exports = new Monitor;
