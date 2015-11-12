var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sessionidSchema  = new Schema({
    devSN     : {type:String, unique:true},
    sessionid : String
});
sessionidSchema.methods.addSessionid = function(devSN, sessionid) {
    this.devSN     = devSN;
    this.sessionid = sessionid;
};

var connectionSchema  = new Schema({
    correlation   : {type:String, unique:true},
    serverAddress : String
});
connectionSchema.methods.addConnection = function(correlation, address) {
    this.correlation   = correlation;
    this.serverAddress = address;
};

function ConnectionModel() {
    this.sessionidModel  = null;
    this.connectionModel = null;
    this.redisClient     = null;
}

ConnectionModel.prototype.createConnectionModel = function (dbhd) {
    this.sessionidModel  = dbhd.mongo.model('sessionid', sessionidSchema);
    this.connectionModel = dbhd.mongo.model('connection', connectionSchema);
    this.redisClient     = dbhd.redisClient;
};

ConnectionModel.prototype.createConnectionRedis = function (redisClient) {
    this.redisClient = redisClient;
    return this.redisClient;
};

// 将websocket连接与webserver地址的对应关系存到redis数据库和mongoose数据库中
ConnectionModel.prototype.setAddressByCorrelation = function (correlation, address) {
    // 将websocket连接与webserver地址的对应关系存redis内存数据库
    connModel.redisClient.set(correlation, address, function(err, reply){
        if (!err) {
            console.log('set webserver address to redis success. key = %s.', correlation);
            // 设置数据在redis数据库中的失效时间为一天
            connModel.redisClient.expire(correlation, 86400);
        }else {
            console.log('set webserver address to redis failed with error: ' + err);
        }
    });
    // 存mongoose数据库
    var newModel = connModel.connectionModel;
    var connectionEntity = new newModel();
    connectionEntity.addConnection(correlation, address);
    console.log('add connectionEntity: ' + connectionEntity);
    connectionEntity.save(function(err) {
        if (!err) {
            console.log('the new connectionEntity is saved success');
        } else {
            console.log('save new connectionEntity with error: ' + err);
        }
    });
};

/*
 * 根据correlation获取与之对应的web server端的ip地址。目前该映射既保存在redis内存数据库中，又保存在mongoose数据库中。
 * 先到redis中查找，找不到的话再到mongoose中找，如果在mongoose中找到了，记得再同步到redis中，以提高下次查找效率，提高命中率。
 */
ConnectionModel.prototype.getAddressByCorrelation = function (correlation, callback) {
    if (typeof(callback) !== "function") {
        return console.error("  Error: the param 'callback' must be a function");
    }
    connModel.redisClient.get(correlation, function(err, reply){
        if (!err) {
            console.log('get webserver address from redis success. key/value = (%s)/%s', correlation, reply);
            if (reply != null) {
                return callback(err, reply);
            }else {
                console.log('  the webserver address from redis is null. begin to find from mongoose...');
            }
        }else {
            console.log('get webserver address from redis failed with error: %s. begin to find from mongoose...', err);
        }
        connModel.connectionModel.find({correlation:correlation}, function(error, results) {
            if (!error) {
                console.log('find webserver address from mongoose success: ' + results);
                if (results == '') {
                    console.log('webserver address from mongoose is null.');
                    callback(error, null);
                }else {
                    console.log('webserver address: ' + results[0].serverAddress);
                    callback(error, results[0].serverAddress);
                    /* 将设备与云端对应关系存redis内存数据库 */
                    connModel.redisClient.set(correlation, results[0].serverAddress, function(err, reply){
                        if (!err) {
                            console.log('set webserver address to redis success. key/value = (%s)/%s ', correlation,  reply.toString());
                            /* 设置数据在redis数据库中的失效时间为一天 */
                            connModel.redisClient.expire(correlation, 86400);
                        }else {
                            console.log('set webserver address to redis failed with error: %s. key = %s.', err, correlation);
                        }
                    });
                }
            }else {
                console.log('find webserver address from mongoose with error: ' + error);
                callback(error);
            }
        });
    });
};

// 将websocket连接与webserver地址的对应关系存到redis数据库和mongoose数据库中
ConnectionModel.prototype.setWebserverAddress = function (devSN, sessionid, devModName, cloudModName, address) {
    // ---1.将devSN与sessionid的对应关系存redis内存数据库
    connModel.redisClient.set(devSN, sessionid, function(err, reply){
        if (!err) {
            console.log('set sessionid to redis success. key = %s.', devSN);
            // 设置数据在redis数据库中的失效时间为一天
            connModel.redisClient.expire(devSN, 86400);
        }else {
            console.log('set sessionid to redis failed with error: ' + err);
        }
    });

    var correlation = devSN + '/' + sessionid + '/' + devModName + '/' + cloudModName;
    // ---2.将websocket连接与webserver地址的对应关系存redis内存数据库
    connModel.redisClient.set(correlation, address, function(err, reply){
        if (!err) {
            console.log('set webserver address to redis success. key = %s.', correlation);
            // 设置数据在redis数据库中的失效时间为一天
            connModel.redisClient.expire(correlation, 86400);
        }else {
            console.log('set webserver address to redis failed with error: ' + err);
        }
    });

    // ---3.sessionid存mongoose数据库
    connModel.sessionidModel.find({devSN:devSN}, function(error, results) {
        if (!error) {
            console.log('find sessionid from mongoose success: ' + results);
            if (results == '') {
                console.log('sessionid from mongoose is null.');
                var sessionidEntity = new connModel.sessionidModel();
                sessionidEntity.addSessionid(devSN, sessionid);
                console.log('add sessionidEntity: ' + sessionidEntity);
                sessionidEntity.save(function(err) {
                    if (!err) {
                        console.log('the new sessionid is saved success');
                    } else {
                        console.log('save new sessionid with error: ' + err);
                    }
                });
            }else {
                connModel.sessionidModel.update({devSN:devSN},{$set:{"sessionid":sessionid}},function(err){
                    if (!err) {
                        console.log('update sessionid success. devSN = %s', devSN);
                    }else {
                        console.log('update sessionid failed. devSN/Error = %s/%s', devSN, err);
                    }
                });
            }
        }else {
            console.log('find sessionid from mongoose with error: ' + error);
        }
    });
    // ---4.连接存mongoose数据库
    connModel.connectionModel.find({correlation:correlation}, function(error, results) {
        if (!error) {
            console.log('find webserver address from mongoose success: ' + results);
            if (results == '') {
                console.log('webserver address from mongoose is null.');
                var newModel = connModel.connectionModel;
                var connectionEntity = new newModel();
                connectionEntity.addConnection(correlation, address);
                console.log('add connectionEntity: ' + connectionEntity);
                connectionEntity.save(function(err) {
                    if (!err) {
                        console.log('the new webserver address is saved success');
                    } else {
                        console.log('save new webserver address with error: ' + err);
                    }
                });
            }else {
                connModel.connectionModel.update({correlation:correlation},{$set:{"serverAddress":address}},function(err){
                    if (!err) {
                        console.log('update webserver address success. correlation = %s', correlation);
                    }else {
                        console.log('update webserver address failed. correlation/Error = %s/%s', correlation, err);
                    }
                });
            }
        }else {
            console.log('find webserver address from mongoose with error: ' + error);
        }
    });
};

function getWebserverAddrFromMongo(devSN, devModName, cloudModName, callback) {
    connModel.sessionidModel.find({devSN:devSN}, function(error, results) {
        if (!error) {
            console.log('find sessionid from mongoose success: ' + results);
            if (results == '') {
                console.log('sessionid from mongoose is null.');
                callback(error, null);
            }else {
                var sessionid = results[0].sessionid;
                console.log('sessionid: ' + sessionid);
                correlation = devSN + '/' + sessionid + '/' + devModName + '/' + cloudModName;
                connModel.getAddressByCorrelation(correlation, callback);
                /* 将devSN与sessionid对应关系存redis内存数据库 */
                connModel.redisClient.set(devSN, sessionid, function(err, reply){
                    if (!err) {
                        console.log('set sessionid to redis success: ' + reply.toString());
                        /* 设置数据在redis数据库中的失效时间为一天 */
                        connModel.redisClient.expire(devSN, 86400);
                    }else {
                        console.log('set sessionid to redis failed with error: ' + err);
                    }
                });
            }
        }else {
            console.log('find sessionid from mongoose with error: ' + error);
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
        return console.error('  Error: the param callback of getWebserverAddress must be a function');
    }
    var correlation;
    connModel.redisClient.get(devSN, function(err, reply) {
        if (!err) {
            console.log('get sessionid from redis success. key/value = %s/%s', devSN, reply);
            if (reply != null) {
                correlation = devSN + '/' + reply + '/' + devModName + '/' + cloudModName;
                connModel.getAddressByCorrelation(correlation, callback);
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

var connModel = module.exports = new ConnectionModel;