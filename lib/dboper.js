/**
 * 该文件用来初始化数据库的连接
 */
var redis    = require('redis');
var mongoose = require('mongoose');

function DbOper() {
    this.redisClient = null;
    this.mongo = null;
    this.Schema = mongoose.Schema;

    this.setRedisPara = function(para) {
        redisPara.port = para.port;
        redisPara.host = para.host;
    };
    this.getRedisPara = function() {
        return redisPara;
    };
    this.setMongoPara = function(para) {
        mongoPara = para;
    };
    this.getMongoPara = function() {
        return mongoPara;
    };

    // 私有属性
    // redis数据库连接参数，形如：{'port':6379, 'host':'192.168.110.34'}。默认为微软云上的环境
    var redisPara = {'port':6379, 'host':'h3crd-wlan17'};
    // mongoose数据库连接参数，形如：'mongodb://admin:admin@192.168.110.33:40000/lyytest'。默认为微软云上的环境
    var mongoPara = 'mongodb://admin:admin@h3crd-wlan16:27017/WLAN';
}

// 连接redis数据库，如果只需要连接redis数据库，可调用此函数
// redisPara形如：{'port':6379, 'host':'192.168.110.34'}
DbOper.prototype.connectRedis = function(redisPara) {
    if (redisPara != undefined) {
        this.setRedisPara(redisPara);
    }
    var para = this.getRedisPara();
    this.redisClient = redis.createClient(para.port, para.host);

    this.redisClient.on("connect", function(){
        console.log((new Date()) + ' Connect to redis success: ' + JSON.stringify(para));
    });
    this.redisClient.on("end", function(){
        console.log((new Date()) + ' End connection to redis.');
    });
    this.redisClient.on("error", function(err){
        console.log((new Date()) + " redis Error: " + err);
    });
};

// 连接mongoose数据库，如果只需要连接mongoose数据库，可调用此函数
// mongoosePara形如：'mongodb://admin:admin@192.168.110.33:40000/lyytest'
DbOper.prototype.connectMongoose = function(mongoosePara) {
    if (mongoosePara != undefined) {
        this.setMongoPara(mongoosePara);
    }
    var para = this.getMongoPara();
    this.mongo = mongoose.createConnection(para);

    this.mongo.on('connected', function() {
        console.log((new Date()) + ' Connect to mongoose success：' + para);});
    this.mongo.on('disconnected', function() {
        console.log((new Date()) + ' Disconnect to mongoose.');});
    this.mongo.on('error', function(error) {
        console.log((new Date()) + ' Connect to mongoose with error: ' + error);
    });
};

// 连接redis数据库和mongoose数据库
DbOper.prototype.connectDatabase = function(redisPara, mongoosePara) {
    this.connectRedis(redisPara);
    this.connectMongoose(mongoosePara);
};

var dboper = module.exports = new DbOper;