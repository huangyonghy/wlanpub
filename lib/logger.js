var config     = require('config');
var fs         = require('fs');
var log4js     = require('log4js');
var basic      = require('./basic');
var log4jsConfig;

if (config.has('log4jsConfig')) {
    log4jsConfig = config.get('log4jsConfig');
}

if(log4jsConfig) {
    /* log日志的配置 */
    var logDir = log4jsConfig.appenders[1].filename;
    if(logDir) {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
    }

    /* 给日志文件名加上IP地址 */
    var IpAdress = basic.getLocalIP('eth', 'IPv4');
    if(log4jsConfig.appenders) {
        for (var i = 0; i < log4jsConfig.appenders.length; i++) {
            if (log4jsConfig.appenders[i].pattern) {
                /* 把IP和微服务名移到filename字符串后面 */
                var serviceName = log4jsConfig.appenders[i].pattern.split("-", 1);
                log4jsConfig.appenders[i].pattern = log4jsConfig.appenders[i].pattern.slice(serviceName[0].length);
                log4jsConfig.appenders[i].filename = log4jsConfig.appenders[i].filename + IpAdress + '-' + serviceName[0];
            }
        }
    }

    log4js.configure(log4jsConfig);

    /* 将uncaughtException异常截获打印到log */
    process.on('uncaughtException',function(err){
        console.error(err.stack);
        process.emit('exit',1);
    });
}


module.exports = log4jsConfig;
