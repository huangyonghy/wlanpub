var url    = require('url');
var os     = require('os');
var child_process = require('child_process');

var redis  = require('ioredis');
var ranaly = require('node_ranaly');
var uuid   = require('uuid');
var async  = require('async');

var basic   = require('./basic');
var serName = require('./constants');

function Monitor() {
  this.client = null;
  this.redisClient = null;
  this._keyPrefix  = 'MONIT';
  this._comPrefix  = 'MONIT:';

  // 业务实例，访问统计，事件告警相关
  this._insEntryKey= 'WLANMONIT';
  this._keyTailReq = ':REQ';
  this._keyTailRes = ':RES';
  this._keyTailResErr = ':RESERR';
  this._keyTailUsage = ':USAGE';
  this._usageBucketLen = 100;
  this._usageInterval  = 1000*60; // ms, 1min
  this._instanceInterval  = 1000*60*10; // ms, 10min
  this._redisKeyTtl    = 60*60*24*5;  // s, 5days
  this._usageBucketObj = null;
  this._mainLinkBucketObj = null;
  this._subLinkBucketObj  = null;
  this._pid = 0;
  this._instanceName = '';

  // VM相关
  this._keyTailHostname  = ':HOSTNAME';   // ip map hostname
  this._hostname = 'unknown';

  // chatserver统计
  this._chatSumLinkBucketObj   = null;
  this._chatValidLinkBucketObj = null;
  this._chatSumUserBucketObj   = null;
  this._chatValidUserBucketObj = null;
  this._keyTailSumUsr   = ':SUMUSR';
  this._keyTailValidUsr = ':VADUSR';

  // 性能统计相关
  this.sectNum = {
    'req'  : 1,
    'send' : 2,
    'take' : 3,
    'reply': 4,
    'recv' : 5,
    'res'  : 6
  };
  this.sectMark = {
    'req'  : 'req',
    'send' : 'send',
    'take' : 'take',
    'reply': 'reply',
    'recv' : 'recv',
    'res'  : 'res'
  };
  this.sectPoint = {
    'req'  : 'reqTime',
    'send' : 'sendTime',
    'take' : 'takeTime',
    'reply': 'replyTime',
    'recv' : 'recvTime',
    'res'  : 'resTime'
  };
  this._perfBucketLen   = 100;
  this._reqIDKeyTtl     = 60*10;   // s, 10分钟
  this._httpkeyTailList = ':HTTP:LIST';
  this._socketKeyTailList = ':SOCKET:LIST';
  this._httpReqType     = 'HTTP';
  this._socketReqType   = 'SOCKET';
  this._keyTailSectID   = [':TAKREP', ':SNDRCV', ':REQRES'];
  this._keyTailSectDiff = [':<100MS', ':<500MS', ':>=500MS'];

  this._setRedisPara = function (para) {
    redisPara.port = para.port;
    redisPara.host = para.host;
  };
  this._getRedisPara = function() {
    return redisPara;
  };
  this._setRedisParaEnv = function() {
    var node_env = process.env.NODE_ENV;

    if ((node_env != undefined) && (node_env == 'production')) {
      this._setRedisPara(redisCloudPara);
    } else {
      this._setRedisPara(redisLocalPara);
    }
  };

  var redisPara  = {
    'port' :  6389,
    'host' :  '172.16.4.147'
  };
  var redisLocalPara  = {
    'port' :  6379,
    'host' :  '172.27.8.117'
  };
  var redisCloudPara  = {
    'port' :  6379,
    'host' :  '172.16.4.25'
  };

/*    var redisLocalPara  = {
    'port' :  7000,
    'host' :  '172.27.8.110'
  };
  var redisCloudPara  = {
    'port' :  6389,
    'host' :  '172.16.4.147'
  };
*/
}

Monitor.prototype.createProcessStats = function (moduleName, redisPara) {
/*    if (redisPara != undefined) {
      this._setRedisPara(redisPara);
  } else {
      this._setRedisParaEnv();
  }
*/
  // 忽略redisPara
  this._setRedisParaEnv();
  var para = this._getRedisPara();

//    this.redisClient = new redis.Cluster([para]);
  this.redisClient = new redis(para);

  this.client = ranaly.createClient(this.redisClient, this._keyPrefix);

  /* 选择Redis数据库序号 1 */
  this.redisClient.select(1);

  this.redisClient.on('ready', function () {
    console.log((new Date()) + ' [MONIT]Connect to monitor for %s is ready: %s', moduleName, JSON.stringify(para));

    monitor._processStats(moduleName);

    // 生成webscoket主子连接统计用的ranaly桶
    if (serName.serviceName.webserver === moduleName) {
      monitor._mainLinkBucketObj = new monitor.client.Amount(moduleName + monitor._keyTailReq);
      monitor._subLinkBucketObj  = new monitor.client.Amount(moduleName + monitor._keyTailRes);
    }

    // 生成chatServer websocket连接统计用的ranaly桶
    if (serName.serviceName.chatserver === moduleName) {
      monitor._chatSumLinkBucketObj   = new monitor.client.Amount(moduleName + monitor._keyTailReq);
      monitor._chatValidLinkBucketObj = new monitor.client.Amount(moduleName + monitor._keyTailRes);
      monitor._chatSumUserBucketObj   = new monitor.client.Amount(moduleName + monitor._keyTailSumUsr);
      monitor._chatValidUserBucketObj = new monitor.client.Amount(moduleName + monitor._keyTailValidUsr);
    }
  });

  this.redisClient.on('error', function (err) {
    console.error((new Date()) + '[MONIT]Failed to create monitor client for '+moduleName+' with '+err+', redis option: '+JSON.stringify(para));
  });

  this.redisClient.on('end', function() {
    console.warn((new Date()) + '[MONIT]Current established connection has closed.');
  });
};

/**
 * Statistical response information
 */
Monitor.prototype.accessStats = function(req, res, next){
  var pathname = url.parse(req.url).pathname;
  var arry = pathname.split('/');
  var name = arry[2];

  if (('ace' == name) || ('web' == name) || ('ant' == name) ||
      ('jag' == name) || ('wloc' == name) || ('arb' == name) ||
      ('fs' == name)) {
    name = arry[3];
  }
  //console.log('[MONIT]'+pathname+':'+name);

  if (('' != name) && (undefined != name)) {
    var isValidService = serName.bIsValidService(name, true);
    if (isValidService) {
      // 生成http请求标识 和 时间ms数
      var reqID = [name, uuid.v1()].join(':');
      var reqTimeMS = (new Date()).getTime();

      monitor._reqCount(name, reqTimeMS);
      monitor._httpReqResTime(reqID, monitor.sectMark.req);

      res.on('finish', function() {
        if ( res.statusCode < 400 ) {
           monitor._resCount(name, reqTimeMS);
        } else {
          monitor._resErrCount(name, reqTimeMS);
          console.warn('[MONIT]'+name+' response failed with status code: ' + res.statusCode);
        }

        monitor._httpReqResTime(reqID, monitor.sectMark.res);
      });
    }
  }

  next();
};

/**
 * websocket link Stats for webserver
 */
Monitor.prototype.webServerLinkIncr = function(bIsMain, num) {
  var bucket  = null;

  if (bIsMain) {
    bucket  = monitor._mainLinkBucketObj;
  } else {
    bucket  = monitor._subLinkBucketObj;
  }

  if (null == bucket) {
    console.warn('[MONIT]Connection to monitor redis is not ready!');

    return;
  }

  if (undefined === num) {
    num = 1;
  }

  bucket.incr(num, function(err, total) {
    if (err) {
      console.error('[MONIT]Failed to increase websocket link-cnt.');
    }
  });
};

Monitor.prototype.webServerLinkDecr = function(bIsMain, num) {
  var bucket  = null;

  if (bIsMain) {
    bucket  = monitor._mainLinkBucketObj;
  } else {
    bucket  = monitor._subLinkBucketObj;
  }

  if (null == bucket) {
    console.warn('[MONIT]Connection to monitor redis is not ready!');

    return;
  }

  if (undefined === num) {
    num = 1;
  }

  bucket.decr(num, function(err, total) {
    if (err) {
      console.error('[MONIT]Failed to decrement websocket link-cnt.');
    }
  });
};

/**
 * users/websocket link Stats for chatServer
 */
Monitor.prototype.chatServerLinkStats = function(linkNum, validNum) {
  monitor._chatSumLinkBucketObj.setGross(linkNum, function(err, num) {
    if (err) {
      console.error('[MONIT]Failed to set chatserver total link-cnt gross.');
    }
  });

  monitor._chatValidLinkBucketObj.setGross(validNum, function(err, num) {
    if (err) {
      console.error('[MONIT]Failed to set chatserver valid link-cnt gross.');
    }
  });
};

Monitor.prototype.chatServerUserStats = function(userNum, validNum) {
  monitor._chatSumUserBucketObj.setGross(userNum, function(err, num) {
    if (err) {
      console.error('[MONIT]Failed to set chatserver total user-cnt gross.');
    }
  });

  monitor._chatValidUserBucketObj.setGross(validNum, function(err, num) {
    if (err) {
      console.error('[MONIT]Failed to set chatserver valid user-cnt gross.');
    }
  });
};

// websocket请求响应分段时间统计
Monitor.prototype.webSocketSectTime = function (socketID, sectID) {
  var redis = monitor.redisClient;
  var name  = socketID.split(':')[0];
  var socketIDKey = monitor._comPrefix + socketID + ':' + sectID;
  var dotTime = (new Date()).getTime();

  if (null == redis) {
    console.warn('[MONIT]Connection to monitor redis is not ready!');

    return;
  }

  redis.set(socketIDKey, dotTime);
//  redis.expire(socketIDKey, monitor._reqIDKeyTtl);

  if (monitor.sectMark.req === sectID) {
    var bucket = new monitor.client.DataList(name + monitor._socketKeyTailList);

    bucket.range(monitor._perfBucketLen-1, monitor._perfBucketLen-1, function(err, idvalue) {
      if (idvalue.length == 1) {
        var reqID = idvalue[0];

        redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark.req);
        redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark.send);
        redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark.recv);
        redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark.res);
      /*
        for (var section in monitor.sectMark) {
          redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark[section]);
        }
      */
      }
    });

    bucket.push(socketID, monitor._perfBucketLen, function (err, len) {
      if (err) {
        console.error('[MONIT]Failed to save websocket request ID: ' + err + ' ' + socketID);
      }
    });
  }

  // 计算存储分段时长
  if (monitor.sectMark.res === sectID) {
    async.parallel({
      reqT: function(callback_q) {
        monitor._getSectDotTime(monitor._comPrefix + socketID + ':' + monitor.sectMark.req, callback_q);
      },
      sendT: function(callback_s) {
        monitor._getSectDotTime(monitor._comPrefix + socketID + ':' + monitor.sectMark.send, callback_s);
      },
      recvT: function(callback_r) {
        monitor._getSectDotTime(monitor._comPrefix + socketID + ':' + monitor.sectMark.recv, callback_r);
      }
    },
    function (error, result) {
      if (null != result.reqT) {
        monitor._saveTimeDiff(monitor._socketReqType, name, 2, dotTime - result.reqT);
      }

      if ((null != result.sendT) && (null != result.recvT)) {
        monitor._saveTimeDiff(monitor._socketReqType, name, 1, result.recvT - result.sendT);
      }
    });
  }
};

Monitor.prototype.httpSectTime = function (httpID, sectID) {
  var redis = monitor.redisClient;
  var name  = httpID.split(':')[0];
  var httpIDKey = monitor._comPrefix + httpID + ':' + sectID;
  var dotTime = (new Date()).getTime();

  if (null == redis) {
    console.warn('[MONIT]Connection to monitor redis is not ready!');

    return;
  }

  redis.set(httpIDKey, dotTime);
//  redis.expire(httpIDKey, monitor._reqIDKeyTtl);

  if (monitor.sectMark.send === sectID) {
    var bucket = new monitor.client.DataList(name + monitor._httpkeyTailList);

    bucket.range(monitor._perfBucketLen-1, monitor._perfBucketLen-1, function(err, idvalue) {
      if (idvalue.length == 1) {
        var reqID = idvalue[0];

        for (var section in monitor.sectMark) {
          redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark[section]);
        }
      }
    });

    bucket.push(httpID, monitor._perfBucketLen, function (err, len) {
      if (err) {
        console.error('[MONIT]Failed to save http request ID: ' + err + ' ' + httpID);
      }
    });
  }

  // 计算存储分段时长
  if (monitor.sectMark.recv === sectID) {
    async.parallel({
      sendT: function(callback_s) {
        monitor._getSectDotTime(monitor._comPrefix + httpID + ':' + monitor.sectMark.send, callback_s);
      },
      takeT: function(callback_t) {
        monitor._getSectDotTime(monitor._comPrefix + httpID + ':' + monitor.sectMark.take, callback_t);
      },
      replyT: function(callback_p) {
        monitor._getSectDotTime(monitor._comPrefix + httpID + ':' + monitor.sectMark.reply, callback_p);
      }
    },
    function (error, result) {
      if (null != result.sendT) {
        monitor._saveTimeDiff(monitor._httpReqType, name, 1, dotTime - result.sendT);
      }

      if ((null != result.takeT) && (null != result.replyT)) {
        monitor._saveTimeDiff(monitor._httpReqType, name, 0, result.replyT - result.takeT);
      }
    });
  }
};

/*
* http section timestamp especially for req & res in webserver access statistic.
*
* */
Monitor.prototype._httpReqResTime = function (httpID, sectID) {
  var redis = monitor.redisClient;
  var name  = httpID.split(':')[0];
  var httpIDKey = monitor._comPrefix + httpID + ':' + sectID;
  var dotTime = (new Date()).getTime();

  if (null == redis) {
    console.warn('[MONIT]Connection to monitor redis is not ready!');

    return;
  }
  redis.set(httpIDKey, dotTime);
//  redis.expire(httpIDKey, monitor._reqIDKeyTtl);

  if (monitor.sectMark.req === sectID) {
    var bucket = new monitor.client.DataList(name + monitor._httpkeyTailList);

    bucket.range(monitor._perfBucketLen-1, monitor._perfBucketLen-1, function(err, idvalue) {
      if (idvalue.length == 1) {
        var reqID  = idvalue[0];

        for (var section in monitor.sectMark) {
          redis.del(monitor._comPrefix + reqID + ':' + monitor.sectMark[section]);
        }
      }
    });

    bucket.push(httpID, monitor._perfBucketLen, function (err, len) {
      if (err) {
        console.error('[MONIT]Failed to save http request ID: ' + err + ' ' + httpID);
      }
    });
  } else {
    // 计算存储分段时长
    redis.get(monitor._comPrefix + httpID + ':' + monitor.sectMark.req, function (error, reqTime) {
      if (null != reqTime) {
        monitor._saveTimeDiff(monitor._httpReqType, name, 2, dotTime - reqTime);
      } else {
        console.error('[MONIT]Failed to get http section req-time: ' + error + ' ' + httpID);
      }
    });
  }
};

/* @param reqType: 'HTTP' or 'SOCKET'
 * @sectIndex  分段时长索引 0 --- TAKREP, 1 --- SNDRCV, 2 --- REQRES
 *
 */
Monitor.prototype._saveTimeDiff = function(reqType, serName, sectIndex, timeDiff) {
  var diffIndex  = (timeDiff < 100) ? 0 : ((timeDiff >= 500) ? 2 : 1);
  var keyTail    = monitor._keyTailSectID[sectIndex] + monitor._keyTailSectDiff[diffIndex];
  var bucketName = [serName, reqType].join(':') + keyTail;
  var bucketObj  = new monitor.client.Amount(bucketName);

  bucketObj.incr(1, function (err, total) {
    if (err) {
      console.error('[MONIT]Failed to increase section duration count.');
    }
  });
};

/*
* 异步同步场景使用的获取打点值
* */
Monitor.prototype._getSectDotTime = function (reqIDKey, callback) {
  var stamp = 0;

  monitor.redisClient.get(reqIDKey, function (err, stamp) {
    callback(null, stamp);
  });
};

//统计各个业务进程基本信息
Monitor.prototype._processStats =  function (serviceName) {
  var ip    = basic.getLocalIP('eth', 'ipv4');
  var pid   = process.pid;
//  var instanceName = [os.hostname(), serviceName, pid].join(':');
  var instanceName = [ip, serviceName, pid].join(':');
  var serviceInfo  = {
    'name'   : '',
    'ipv4'   : '',
    'pid'    : 0,
    'starttime': ''
  };
  var bIsWebserver = (serviceName == serName.serviceName.webserver) ? true : false;

  if ( !bIsWebserver && (!serName.bIsValidService(serviceName)) ) {
    return ;
  }

  // 生成实例 usage 存储用的 ranaly桶
  this._usageBucketObj = new this.client.DataList(instanceName + this._keyTailUsage);
  this._pid = pid;
  this._instanceName = instanceName;

  // 实例基本信息
  serviceInfo.name   = serviceName;
  serviceInfo.ipv4   = ip;
  serviceInfo.status = "run";
  serviceInfo.pid    = pid;
  serviceInfo.starttime = (new Date()).toLocaleString();
//  serviceInfo.hostname  = basic.getHostname(pid, ip);
  async.parallel({
    host: function(callback) {
      monitor._getHostname(pid, ip, callback);
    }
  },
  function(error, result) {
    if ('unknown' == result.host) {
      setTimeout(function() {
        async.parallel({
          host: function(callback) {
            monitor._getHostname(pid, ip, callback);
          }
        },function(err, result) {
          serviceInfo.hostname = monitor._hostname = result.host;
        });
      }, this._usageInterval);
    }

    serviceInfo.hostname = monitor._hostname = result.host;
    monitor._saveBasicInfo(serviceInfo);
  });

  /*  与log4js接管冲突
  process.on('uncaughtException', function(err) {
    serviceInfo.status = "error";
    console.error('[MONIT]Process '+serviceName+' caught exception: '+err);
  });
  */
  process.on('beforeExit', function() {
    serviceInfo.status   = "beforeExit";
    serviceInfo.downtime = (new Date()).toLocaleString();

    monitor._saveBasicInfo(serviceInfo);
  });

  process.on('exit', function(code) {
    serviceInfo.status   = "exit";
    serviceInfo.exitCode = code;
    serviceInfo.downtime = (new Date()).toLocaleString();

    // 尽力写入DB
    monitor._saveBasicInfo(serviceInfo);
      // 与log4js接管冲突
  //    console.log('[MONIT]Process '+serviceName+' exit with code: '+code);
  });

  /* cpu mem , 这里假设pid<100为Docker容器内运行的进程 */
  if (pid < 100) {
    setInterval(this._savePodUsage, this._usageInterval);
  } else {
    setInterval(this._saveHostUsage, this._usageInterval);
  }

  // process basic info
  setInterval(function() {
    monitor._saveBasicInfo(serviceInfo);
  }, this._instanceInterval);
};

/**
 * Save business name to redis
 */
Monitor.prototype._saveBusiness = function(porName) {
  // 将索引值作为分数存入redis setlist中
  this.redisClient.zadd(this._insEntryKey, serName['serviceIdx'][porName],
              serName['serviceName'][porName]);
};

// 容器内
Monitor.prototype._savePodUsage = function () {
  var usageInfo = {
    'cpuUsage' : '',
    'memUsage' : '',
    'memMbytes' : 0
  };
  var cmd = 'top -b -n 1 | grep node | grep -v grep';

  var ch = child_process.exec(cmd, function (error, stdout, stderr) {
    var tmp = basic.trimSpaces(stdout).split(' ');
    var rss = process.memoryUsage().rss;
  //  var cpu = (tmp[7] != 'node') ? tmp[7] : tmp[6];
    var cpu = tmp[tmp.indexOf('node') - 1];
    usageInfo.cpuUsage = cpu;
  //  usageInfo.memUsage = tmp[5];  // VSZ
    usageInfo.memUsage = ((rss / os.totalmem())*100).toFixed(1);  // RSS(MEM)
    usageInfo.memMbytes = (rss / (1024*1024)).toFixed(1);
    monitor._saveUsageInfo(usageInfo);
  });
};

// 容器外
Monitor.prototype._saveHostUsage = function () {
  var usageInfo = {
    'cpuUsage' : '',
    'memUsage' : '',
    'memMbytes' : 0
  };
  //    var cmd = 'ps -aux | grep '+name+'.js';
  var cmd = 'ps aux | grep -E \"^root\\s\+' + monitor._pid + '.*\"';

  var ch = child_process.exec(cmd, function (error, stdout, stderr) {
    var tmp = basic.trimSpaces(stdout).split(' ');
    usageInfo.cpuUsage = tmp[2];
    usageInfo.memUsage = tmp[3];  // MEM
    usageInfo.memMbytes = (process.memoryUsage().rss / (1024*1024)).toFixed(1);
    monitor._saveUsageInfo(usageInfo);
  });
};

Monitor.prototype._saveUsageInfo = function (usageInfo) {
  var ranalyKey = this._usageBucketObj.key;

  this._usageBucketObj.push(usageInfo, this._usageBucketLen, function(err, len) {
    if (err) {
      console.log('[MONIT]Failed to save usage info: '+err);
    }
  });
  this.redisClient.expire(ranalyKey, this._redisKeyTtl);
};

/*
 *将获取到的基本信息存到redis数据库中去
 */
Monitor.prototype._saveBasicInfo = function(serviceInfo){
  var instanceKey = this._comPrefix + this._instanceName;
  var serviceKey  = this._comPrefix + serviceInfo.name;
  var hostnamekey = this._comPrefix + serviceInfo.hostname;

  // 存模块名
  this._saveBusiness(serviceInfo.name);

  // 存业务名->实例名
  this.redisClient.sadd(serviceKey, this._instanceName);
  this.redisClient.expire(serviceKey, this._redisKeyTtl);

  // 存主机名->实例名
  this.redisClient.sadd(hostnamekey, this._instanceName);
  this.redisClient.expire(hostnamekey, this._redisKeyTtl);

  // 存基本信息，确保只存一份
  serviceInfo.updatetime = (new Date()).toLocaleString();
  this.redisClient.spop(instanceKey);
  this.redisClient.sadd(instanceKey, JSON.stringify(serviceInfo));
  this.redisClient.expire(instanceKey, this._redisKeyTtl);
};

//根据业务名，统计该业务访问次数
Monitor.prototype._reqCount =  function (name, when) {
  var bucket = name + this._keyTailReq;
  var reqcnt = new this.client.Amount(bucket);

  reqcnt.incr(1, when, function(err, total) {
    if (err) {
      console.error('[MONIT]Failed to increase request count.');
    }
  });
};

//根据业务名，统计server回应的正常数(返回码 < 400)；
Monitor.prototype._resCount = function(name, when) {
  var bucket = name + this._keyTailRes;
  var rescnt = new this.client.Amount(bucket);

  rescnt.incr(1, when, function(err, total){
    if (err) {
      console.error('[MONIT]Failed to increase response count.');
    }
  });
};

//根据业务名，统计server回应的错误数(返回码 >= 400)；
Monitor.prototype._resErrCount = function(name, when) {
  var bucket = name + this._keyTailResErr;
  var errcnt = new this.client.Amount(bucket);

  errcnt.incr(1, when, function(err, total){
    if (err) {
      console.error('[MONIT]Failed to increase response error count.');
    }
  });
};

Monitor.prototype._getHostname = function (pid, ipv4, callback) {
  var redis = monitor.redisClient;
  var subIP = ipv4;

  if (pid < 100) {
    var ipary = ipv4.split('.');

    ipary[3] = '1';
    subIP = ipary.join('.');
  }
  var ip2hostKey = monitor._comPrefix + subIP + monitor._keyTailHostname;

  redis.get(ip2hostKey, function (error, hostname) {
    if (null == hostname) {
      hostname = 'unknown';

      console.error('[MONIT]Failed to get hostname for ip ' + subIP + ', Interfaces: ' + JSON.stringify(os.networkInterfaces()));
    }

    if (callback) {
      callback(null, hostname);    // hostname(null)
    } else {
      monitor._hostname = hostname;
    }
  });
};

var monitor = module.exports = new Monitor;
