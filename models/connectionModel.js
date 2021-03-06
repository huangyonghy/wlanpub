var log4js      = require('log4js');
var Schema      = require('mongoose').Schema;
var serviceName = require('../lib/basic').serviceName;

var SID_KEY    = 'devsid:';
var CONN_KEY   = 'conn:';
var BATCH_SIZE = 50;
var LIMIT_NUM  = 1000;

var sessionidSchema  = new Schema({
    devSN     : {type:String, unique:true},
    sessionid : String
});

sessionidSchema.methods.addSessionid = function(devSN, sessionid) {
    this.devSN     = devSN;
    this.sessionid = sessionid;
};

var subconnectionSchema  = new Schema({
    correlation         : { type : String, unique : true, required : true, sparse : true },
    serverAddress       : String
});

subconnectionSchema.methods.addSubconnection = function(correlation, address) {
    this.correlation   = correlation;
    this.serverAddress = address;
};

var connectionSchema  = new Schema({
    devSNandSessionid   : { type : String, unique : true, required : true },
    bDeleting           : Boolean,
    mainconnection      : { correlation : String, serverAddress : String, lastAccess : Number },
    subconnectionArray  : [subconnectionSchema]
});

connectionSchema.methods.addConnection = function(devSNandSessionid, devModName, cloudModName, address) {
    this.devSNandSessionid = devSNandSessionid;
    this.bDeleting         = false;
    var correlation = devSNandSessionid + '/' + devModName + '/' + cloudModName;
    if (cloudModName == serviceName.base) {
        this.mainconnection.correlation   = correlation;
        this.mainconnection.serverAddress = address;
        this.mainconnection.lastAccess    = Date.now();
    }else {
        var subconnEntity = new connModel.subconnectionModel();
        subconnEntity.addSubconnection(correlation, address);
        this.subconnectionArray[this.subconnectionArray.length] = subconnEntity;
    }
};

function ConnectionModel() {
    this.sessionidModel     = null;
    this.connectionModel    = null;
    this.subconnectionModel = null;
    this.redisClient        = null;
}

ConnectionModel.prototype.createConnectionModel = function (dbhd) {
    this.sessionidModel     = dbhd.mongo.model('sessionid', sessionidSchema);
    this.connectionModel    = dbhd.mongo.model('connection', connectionSchema);
    this.subconnectionModel = dbhd.mongo.model('subconnection', subconnectionSchema);
    this.redisClient        = dbhd.redisClient;
};

ConnectionModel.prototype.createConnectionRedis = function (redisClient) {
    this.redisClient = redisClient;
    return this.redisClient;
};

function setWebserverAddress2Redis(devSNandSessionid, devModName, cloudModName, address) {
    var correlation = devSNandSessionid + '/' + devModName + '/' + cloudModName;
    var jsonData = {};
    var redisKey = CONN_KEY + devSNandSessionid;
    connModel.redisClient.get(redisKey, function (err, reply) {
        if (!err) {
            console.log('get connection from redis success. key/value = (%s)/%s', redisKey, reply);
            if (reply != null) {
                jsonData = JSON.parse(reply);
                if (cloudModName == serviceName.base) {
                    if (jsonData.mainconnection == undefined) {
                        jsonData.mainconnection = {};
                    }else if (jsonData.mainconnection.serverAddress == address) {
                        console.warn('mainconnection is the same, return!');
                        return;
                    }
                    jsonData.mainconnection.correlation   = correlation;
                    jsonData.mainconnection.serverAddress = address;
                    jsonData.mainconnection.lastAccess    = Date.now();
                }else {
                    if (jsonData.subconnectionArray == undefined) {
                        jsonData.subconnectionArray = [];
                    }
                    //console.log('reply.subconnectionArray: ' + jsonData.subconnectionArray);
                    //console.log('typeof(reply.subconnectionArray): ' + typeof(jsonData.subconnectionArray));
                    //console.log('reply.subconnectionArray.length: ' + jsonData.subconnectionArray.length);
                    var i;
                    var bFound = false;
                    for (i = 0; i < jsonData.subconnectionArray.length; i++) {
                        var subconnection = jsonData.subconnectionArray[i];
                        if (subconnection.correlation == correlation) {
                            if (subconnection.serverAddress != address) {
                                console.log('update subconnection to redis');
                                jsonData.subconnectionArray[i].serverAddress = address;
                            }else {
                                console.log('subconnection in redis is the same. return!');
                                return;
                            }
                            bFound = true;
                            break;
                        }
                    }
                    if (bFound == false) {
                        console.log('add new subconnection to redis');
                        var newSubconn = {};
                        newSubconn.correlation   = correlation;
                        newSubconn.serverAddress = address;
                        jsonData.subconnectionArray[jsonData.subconnectionArray.length] = newSubconn;
                    }
                }
            }else {
                console.log('the connection from redis is null. begin to add connection.');
                var newConnection = {};
                newConnection.devSNandSessionid = devSNandSessionid;
                newConnection.bDeleting         = false;
                if (cloudModName == serviceName.base) {
                    var newMainConn = {};
                    newMainConn.correlation   = correlation;
                    newMainConn.serverAddress = address;
                    newMainConn.lastAccess    = Date.now();
                    newConnection.mainconnection = newMainConn;
                }else {
                    var newSubConn = {};
                    newSubConn.correlation   = correlation;
                    newSubConn.serverAddress = address;
                    newConnection.subconnectionArray = [];
                    //console.log('connection.subconnectionArray.length: ' + newConnection.subconnectionArray.length);
                    newConnection.subconnectionArray[newConnection.subconnectionArray.length] = newSubConn;
                    //console.log('connection.subconnectionArray.length: ' + newConnection.subconnectionArray.length);
                }
                jsonData = newConnection;
            }
            connModel.redisClient.set(redisKey, JSON.stringify(jsonData), function(err, reply){
                if (!err) {
                    console.log('set connection to redis success. key = %s.', redisKey);
                    // 设置数据在redis数据库中的失效时间为一天
                    connModel.redisClient.expire(redisKey, 86400);
                }else {
                    console.error('set connection to redis failed with error: ' + err);
                }
            });
        }else {
            console.error('get connection from redis failed with error: %s.', err);
        }
    });
}

// 将websocket连接与webserver地址的对应关系存到redis数据库和mongoose数据库中
ConnectionModel.prototype.setWebserverAddress = function (devSN, sessionid, devModName, cloudModName, address) {
    // ---1.将devSN与sessionid的对应关系存redis内存数据库
    var redisKey = SID_KEY + devSN;
    connModel.redisClient.set(redisKey, sessionid, function(err, reply){
        if (!err) {
            console.log('set sessionid to redis success. key = %s.', redisKey);
            // 设置数据在redis数据库中的失效时间为一天
            connModel.redisClient.expire(redisKey, 86400);
        }else {
            console.error('set sessionid to redis failed with error: ' + err);
        }
    });
    // ---2.sessionid存mongoose数据库
    connModel.sessionidModel.update({devSN:devSN}, {$set:{sessionid:sessionid}}, {upsert:true}, function(error) {
        if (!error) {
            console.log('upsert sessionid to mongoose success. key = ' + devSN);
        }else {
            console.error('upsert sessionid to mongoose with error: %s. key = %s', error, devSN);
            console.error(error);
        }
    });

    var devSNandSessionid = devSN + '/' + sessionid;
    // ---3.将websocket连接与webserver地址的对应关系存redis内存数据库
    setWebserverAddress2Redis(devSNandSessionid, devModName, cloudModName, address);

    // ---4.将websocket连接与webserver地址的对应关系存mongoose数据库
    var query  = {};
    var update = {};
    var correlation = devSNandSessionid + '/' + devModName + '/' + cloudModName;
    if (cloudModName == serviceName.base) {
        query  = {devSNandSessionid:devSNandSessionid, $isolated:1};
        update = {$set:{bDeleting:false,
                        'mainconnection.correlation':correlation,
                        'mainconnection.serverAddress':address,
                        'mainconnection.lastAccess':Date.now()}};
        connModel.connectionModel.update(query, update, {upsert:true}, function(error) {
            if (!error) {
                console.log('upsert mainconnection to mongoose success. key = ' + correlation);
            }else {
                console.error('upsert mainconnection to mongoose with error: %s. key = %s', error, correlation);
                console.error(error);
            }
        });
    }else {
        query  = {devSNandSessionid:devSNandSessionid,
                  subconnectionArray:{$elemMatch:{correlation:correlation}},
                  $isolated:1};
        connModel.connectionModel.findOne(query, function(error, result) {
            if (!error) {
                console.log('find subconnection from mongoose success.');
                console.log(result);
                if (result == null) {
                    console.log('subconnection from mongoose is null. key = %s.', correlation);
                    var push = {$set:{bDeleting:false}, $push:{subconnectionArray:{correlation:correlation, serverAddress:address}}};
                    connModel.connectionModel.update({devSNandSessionid:devSNandSessionid, $isolated:1}, push, {upsert:true}, function(error) {
                        if (!error) {
                            console.log('add new subconnection to mongoose success. key = ' + correlation);
                        }else {
                            console.error('add new subconnection to mongoose with error: %s. key = %s', error, correlation);
                            console.error(error);
                        }
                    });
                }else {
                    update = {$set:{bDeleting:false,
                                    'subconnectionArray.$.correlation':correlation,
                                    'subconnectionArray.$.serverAddress':address}};
                    connModel.connectionModel.update(query, update, {upsert:true}, function(error) {
                        if (!error) {
                            console.log('update subconnection success. key = ' + correlation);
                        }else {
                            console.error('update subconnection with error: %s. key = %s', error, correlation);
                            console.error(error);
                        }
                    });
                }
            }
            else {
                console.error('find subconnection from mongoose with error: ' + error);
            }
        });
    }
};

ConnectionModel.prototype.getAddressByDevSNandSessionid = function (devSN, sessionid, devModName, cloudModName, callback) {
    if (typeof(callback) !== "function") {
        return console.error("Error: the param 'callback' must be a function");
    }
    var devSNandSessionid = devSN + '/' + sessionid;
    var correlation       = devSN + '/' + sessionid + '/' + devModName + '/' + cloudModName;
    var redisKey = CONN_KEY + devSNandSessionid;
    connModel.redisClient.get(redisKey, function(err, reply){
        if (!err) {
            console.log('get connection from redis success. key/value = (%s)/%s', redisKey, reply);
            if (reply != null) {
                var jsonData = JSON.parse(reply);
                if (cloudModName == serviceName.base) {
                    if (jsonData.mainconnection != undefined) {
                        console.log('find main connection from redis success');
                        return callback(err, jsonData.mainconnection.serverAddress);
                    }else {
                        console.log('the main connection from redis is null. begin to find from mongoose...');
                    }
                }else {
                    if (jsonData.subconnectionArray != undefined) {
                        var i;
                        for (i = 0; i < jsonData.subconnectionArray.length; i++) {
                            var subconnection = jsonData.subconnectionArray[i];
                            if (subconnection.correlation == correlation) {
                                console.log('find sub connection from redis success');
                                return callback(err, jsonData.subconnectionArray[i].serverAddress);
                            }
                        }
                    }
                    console.log('the sub connection from redis is null. begin to find from mongoose...');
                }
            }else {
                console.log('the connection from redis is null. begin to find from mongoose...');
            }
        }else {
            console.log('get connection from redis failed with error: %s. begin to find from mongoose...', err);
        }
        connModel.connectionModel.findOne({devSNandSessionid:devSNandSessionid}, function(error, result) {
            if (!error) {
                console.log('find connection from mongoose success: ' + result);
                if (result == null) {
                    console.log('connection from mongoose is null.');
                    callback(error, null);
                }else {
                    var connection = result;
                    //console.log('connection: ' + connection);
                    if (cloudModName == serviceName.base) {
                        if (connection.mainconnection != undefined) {
                            console.log('find main connection from mongoose success');
                            setWebserverAddress2Redis(devSNandSessionid, devModName, cloudModName, connection.mainconnection.serverAddress);
                            callback(error, connection.mainconnection.serverAddress);
                        }else {
                            console.log('the main connection from mongoose is null.');
                            callback(error, null);
                        }
                    }else {
                        if (connection.subconnectionArray != undefined) {
                            var i;
                            for (i = 0; i < connection.subconnectionArray.length; i++) {
                                var subconnection = connection.subconnectionArray[i];
                                if (subconnection.correlation == correlation) {
                                    console.log('find sub connection from mongoose success');
                                    setWebserverAddress2Redis(devSNandSessionid, devModName, cloudModName, subconnection.serverAddress);
                                    return callback(error, subconnection.serverAddress);
                                }
                            }
                        }
                        console.log('the sub connection from mongoose is null.');
                        callback(error, null);
                    }
                }
            }else {
                console.error('find connection from mongoose with error: ' + error);
                callback(error);
            }
        });
    });
};

function getWebserverAddrFromMongo(devSN, devModName, cloudModName, callback) {
    connModel.sessionidModel.findOne({devSN:devSN}, function(error, result) {
        if (!error) {
            console.log('find sessionid from mongoose success: ' + result);
            if (result == null) {
                console.log('sessionid from mongoose is null.');
                callback(error, null);
            }else {
                var sessionid = result.sessionid;
                console.log('sessionid: ' + sessionid);
                connModel.getAddressByDevSNandSessionid(devSN, sessionid, devModName, cloudModName, callback);
                // 将devSN与sessionid对应关系存redis内存数据库
                var redisKey = SID_KEY + devSN;
                connModel.redisClient.set(redisKey, sessionid, function(err, reply){
                    if (!err) {
                        console.log('set sessionid to redis success. key = %s.', redisKey);
                        // 设置数据在redis数据库中的失效时间为一天
                        connModel.redisClient.expire(redisKey, 86400);
                    }else {
                        console.error('set sessionid to redis failed with error: ' + err);
                    }
                });
            }
        }else {
            console.error('find sessionid from mongoose with error: ' + error);
            callback(error);
        }
    });
}

/*
 * 根据correlation获取与之对应的web server端的ip地址。目前该映射既保存在redis内存数据库中，又保存在mongoose数据库中。
 * 先到redis中查找，找不到的话再到mongoose中找，如果在mongoose中找到了，记得再同步到redis中，以提高下次查找效率，提高命中率。
 */
ConnectionModel.prototype.getWebserverAddress = function (devSN, devModName, cloudModName, callback) {
    if (typeof(callback) !== "function") {
        return console.error('Error: the param callback of getWebserverAddress must be a function');
    }
    if (connModel.redisClient == null) {
        return callback(null, null);
    }
    var redisKey = SID_KEY + devSN;
    connModel.redisClient.get(redisKey, function(err, reply) {
        if (!err) {
            console.log('get sessionid from redis success. key/value = %s/%s', redisKey, reply);
            if (reply != null) {
                connModel.getAddressByDevSNandSessionid(devSN, reply, devModName, cloudModName, callback);
            }else {
                console.log('the sessionid from redis is null. begin to find from mongoose...');
                getWebserverAddrFromMongo(devSN, devModName, cloudModName, callback);
            }
        }else {
            console.log('get sessionid from redis with error. begin to find from mongoose...');
            getWebserverAddrFromMongo(devSN, devModName, cloudModName, callback);
        }
    });
};

ConnectionModel.prototype.delConnections = function (devSNandSessionid) {
    //var devSNandSessionid = devSN + '/' + sessionid;
    var strArray  = devSNandSessionid.split('/');
    var devSN     = strArray[0];
    var sessionid = strArray[1];
    // ---1.删除redis数据库中对应的connections
    var redisKey = CONN_KEY + devSNandSessionid;
    connModel.redisClient.del(redisKey, function(err, reply) {
        if (!err) {
            console.log('del connection from redis success. key/value = (%s)/%s', redisKey, reply);
            connModel.redisClient.get(redisKey, function (err, reply) {
                if (!err) {
                    console.log('get connection from redis success. key/value = (%s)/%s', redisKey, reply);
                }
            });
        }else {
            console.log('del connection from redis with error: ' + err);
        }
    });
    // ---2.删除mongoose数据库中对应的connections
    connModel.connectionModel.remove({devSNandSessionid:devSNandSessionid}, function(error, results) {
        if (!error) {
            console.log('remove connections from mongoose success: %s. devSNandSessionid = %s.', results, devSNandSessionid);
        }else {
            console.error('remove connections from mongoose with error: %s. devSNandSessionid = %s.', error, devSNandSessionid);
        }
    });

    // ---3.删除redis数据库中对应的sessionid
    var sessionidKey = SID_KEY + devSN;
    connModel.redisClient.get(sessionidKey, function(err, reply) {
        if (!err) {
            console.log('get sessionid from redis success. key/value = %s/%s', sessionidKey, reply);
            if (reply != null && reply == sessionid) {
                connModel.redisClient.del(sessionidKey, function(err, reply) {
                    if (!err) {
                        console.log('del sessionid from redis success. key/value = %s/%s', sessionidKey, reply);
                    }else {
                        console.log('del sessionid from redis with error: ' + err);
                    }
                });
            }
        }
    });
    // ---4.删除mongoose数据库中对应的sessionid
    connModel.sessionidModel.findOneAndRemove({devSN:devSN, sessionid:sessionid}, function(error, results) {
        if (!error) {
            console.log('remove sessionid from mongoose success: %s. devSN = %s.', results, devSN);
        } else {
            console.error('remove sessionid from mongoose with error: %s. devSN = %s.', error, devSN);
        }
    });
};

function doDelWork(results, timerInterval, callback1) {
    var i, connection;
    for (i =0; i < results.length; i++) {
        connection = results[i];
        connection.bDeleting = true;
        console.log('begin to del connection');
        callback1(connection);
    }
}

function doLotsWork(results, timerInterval, callback1, callback2){
    //.....do lots of work
    console.log('doLotsWork');
    doDelWork(results, timerInterval, callback1);
    //all done, ready to deal with next 10 records
    process.nextTick(function(){
        callback2();
    });
}

// note:判断连接是否超时只判断了mongoose数据中对应的lastAccess字段的时效性
ConnectionModel.prototype.delOldConnections = function (timerInterval, callback) {
    if (typeof(callback) !== "function") {
        return console.error('Error: the param callback of delOldConnections must be a function');
    }

    var query = {$and: [{bDeleting:false},{$or:[{'mainconnection.lastAccess':undefined}, {'mainconnection.lastAccess':{$lte:Date.now()-timerInterval}}]}]};
    var stream = connModel.connectionModel.find(query, null, {limit:LIMIT_NUM}).stream();
    var cache = [];
    stream.on('data',function(item){
        cache.push(item);
        if (cache.length == BATCH_SIZE){
            // signal mongo to pause reading
            console.log('on data, begin pause');
            stream.pause();
            process.nextTick(function(){
                doLotsWork(cache, timerInterval, callback, function(){
                    cache=[];
                    // signal mongo to continue, fetch next record
                    stream.resume();
                });
            });
        }
    });
    stream.on('end',function(){
        doDelWork(cache, timerInterval, callback);
        console.log('delOldConnections ended');
    });
    stream.on('close',function(){ console.log('stream closed'); });
};

// note:更新主连接的lastAccess时，只更新了mongoose数据库中的对应数据，未更新redis中的对应数据。
// 即:mongoose数据库中主连接的lastAccess字段会保证实时性，而redis中的不保证实时性
ConnectionModel.prototype.updateLastAccess = function (devSN, sessionid) {
    var devSNandSessionid = devSN + '/' + sessionid;
    var query  = {devSNandSessionid:devSNandSessionid, $isolated:1};
    var update = {$set:{'mainconnection.lastAccess':Date.now()}};
    connModel.connectionModel.update(query, update, function(error) {
        if (!error) {
            console.log('update lastAccess success. key = ' + devSNandSessionid);
        }else {
            console.error('update lastAccess with error: %s. key = %s', error, devSNandSessionid);
        }
    });
};

ConnectionModel.prototype.getSessionidByDevSN = function(devSN, callback) {
    if (typeof(callback) !== "function") {
        return console.error('Error: the param callback of getSessionidByDevSN must be a function');
    }

    var redisKey = SID_KEY + devSN;
    connModel.redisClient.get(redisKey, function(err, reply) {
        if (!err) {
            console.log('get sessionid from redis success. key/value = %s/%s', redisKey, reply);
            if (reply != null) {
                return callback(err, reply);
            }else {
                console.log('the sessionid from redis is null. begin to find from mongoose...');
            }
        }else {
            console.log('get sessionid from redis with error. begin to find from mongoose...');
        }
        connModel.sessionidModel.findOne({devSN:devSN}, function(error, result) {
            if (!error) {
                console.log('find sessionid from mongoose success: ' + result);
                if (result == null) {
                    console.log('sessionid from mongoose is null.');
                    callback(error, null);
                }else {
                    var sessionid = result.sessionid;
                    console.log('sessionid: ' + sessionid);
                    // 将devSN与sessionid对应关系存redis内存数据库
                    connModel.redisClient.set(redisKey, sessionid, function(err, reply){
                        if (!err) {
                            console.log('set sessionid to redis success. key = %s.', redisKey);
                            // 设置数据在redis数据库中的失效时间为一天
                            connModel.redisClient.expire(redisKey, 86400);
                        }else {
                            console.error('set sessionid to redis failed with error: ' + err);
                        }
                    });
                    callback(error, sessionid);
                }
            }else {
                console.error('find sessionid from mongoose with error: ' + error);
                callback(error);
            }
        });
    });
};

var connModel = module.exports = new ConnectionModel;