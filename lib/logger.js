var config     = require('config');
var fs         = require('fs');
var log4js     = require('log4js');
var basic      = require('./basic');
var log4jsConfig;

if (config.has('log4jsConfig')) {
    log4jsConfig = config.get('log4jsConfig');
}

if(log4jsConfig) {
    /* log��־������ */
    var logDir = log4jsConfig.appenders[1].filename;
    if(logDir) {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
    }

    /* ����־�ļ�������IP��ַ */
    var IpAdress = basic.getLocalIP('eth', 'IPv4');
    if(log4jsConfig.appenders) {
        for (var i = 0; i < log4jsConfig.appenders.length; i++) {
            if (log4jsConfig.appenders[i].pattern) {
                /* ��IP��΢�������Ƶ�filename�ַ������� */
                var serviceName = log4jsConfig.appenders[i].pattern.split("-", 1);
                log4jsConfig.appenders[i].pattern = log4jsConfig.appenders[i].pattern.slice(serviceName[0].length);
                log4jsConfig.appenders[i].filename = log4jsConfig.appenders[i].filename + IpAdress + '-' + serviceName[0];
            }
        }
    }

    log4js.configure(log4jsConfig);

    /* ��uncaughtException�쳣�ػ��ӡ��log */
    process.on('uncaughtException',function(err){
        console.error(err.stack);
        process.emit('exit',1);
    });
}


module.exports = log4jsConfig;
