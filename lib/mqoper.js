/**
 * Created by Juneja on 2015/9/7.
 *
 * Description: Common methods for RabbitMQ(github.com/postwait/node-amqp)
 */
"use strict";

var amqp   = require('amqp'),
    cons   = require('./constants'),
    basic  = require('./basic'),
    monitor= require('./monitor');

function MqOper() {
    this.connection  = null;
    this.exdirect = null;
    this.exreply  = null;

    /*
     * key: an MQ publish option field
     * value: optional parameter, if doesn't provide then return key's value
     * description: set/get publish option for webserver to MQ
     * */
    this.setSendOption = function (key, value) {
        switch (arguments.length) {
            case 0:
                return sendOption;
                break;
            case 1:
                return sendOption[key];
                break;
            case 2:
                sendOption[key] = value;
                break;
            default:
                console.error("[MQHD]Too much parameters for set/get SendOption.");
        }
    };
    this.getSendOption = this.setSendOption;

    /*
     * hostArray: MQ server hostnames array, optional parameter
     * description: set/get hostnames of MQ server
     *              if doesn't provide 'hostArray' then return current MQServer hostnames
     * */
    this.setHostnames = function (hostArray) {
        switch (arguments.length) {
            case 0:
                return hostnames;
                break;
            case 1:
                hostnames = hostArray;
                break;
            default:
                console.error("[MQHD]Too much parameters for set/get Hostnames.");
        }
    };
    this.getHostnames = this.setHostnames;

    /* private, only for reference */
    var hostnames  = ["h3crd-wlan1", "h3crd-wlan2"];
    var sendOption = {
        "replyTo"    : "",
        "appId"      : ""
    };
    var requestMsg = {
        "headers" : "",
        "url"     : "",
        "method"  : "",
        "body"    : ""
    };

    /*
     * key: an request msg field for MQ
     * value: optional parameter, if doesn't provide then return key's value
     * description: set/get request msg for webserver to MQ
     * */
    var _setRequestMsg = function (key, value) {
        switch (arguments.length) {
            case 0:
                return requestMsg;
                break;
            case 1:
                return requestMsg[key];
                break;
            case 2:
                requestMsg[key] = value;
                break;
            default:
                console.error("[MQHD]Too much parameters for set/get RequestMsg.");
        }
    };
    var _getRequestMsg = _setRequestMsg;
}

/*
 * Generate connect option with serviceName
 * */
MqOper.prototype._genConnectOption = function (serviceName) {
    var hosts    = this.getHostnames();
    var num      = hosts.length;
    var hostIdx  = cons.serviceIdx[serviceName] % num;
    var hostname = hosts[hostIdx];

    var conOption = {};
    conOption.host  = hostname;
    conOption.login = serviceName;
    conOption.password = "123456";

    return conOption;
};

/*
 * pkey: pblish key (service name)
 * msg: msg to send
 * callback: callback参数可选，如果使用callback参数，则对方必须回复该消息
 * Description: 如果是webserver通过MQ发送http消息，则必须使用callback参数;
 * msg format: JSON格式的字符串
 * */
MqOper.prototype.sendMsg = function (pkey, msg, callback) {
    var sendExchage;
    var option = this.getSendOption();

    delete option["correlationId"];
    if (3 == arguments.length) {
        var reqID = basic.setCbMap(callback);
        option.messageId = reqID;
    }

    // 发往微服务的mq消息都使用direct exchange
    if (cons.bIsValidService(pkey, true)) {
        sendExchage = mqoper.exdirect;

        // http请求分段统计
        if (3 == arguments.length) {
            var httpID = [pkey, reqID].join(':');
            option.correlationId = httpID;

            monitor.httpSectTime(httpID, monitor.sectMark.send);
        }
    }
    // 发往webserver的mq消息都使用reply exchange
    else {
        sendExchage = mqoper.exreply;
    }

    if(sendExchage)
    {
        try {
            sendExchage.publish(pkey, msg, option);
            console.log((new Date()) + ' [MQHD]Send message to %s success by %s.', pkey, sendExchage.name);
            console.log('  message: %s', msg);
            console.log('  key/option = %s/%s.', pkey, JSON.stringify(option));
        }
        catch(err) {
            console.error((new Date()) + ' [MQHD]Send message to %s failed with error: %s', pkey, err);
        }
    } else {
        console.warn("[MQHD]Exchange is null or undefined!");
    }
};

/*
 * msg: msg to reply
 * deliverInfo: just as subscribed msg's deliverInfo
 * Description: 该接口仅适用于向webserver回复消息
 * */
MqOper.prototype.replyMsg = function (msg, deliveryInfo) {
    var option = this.getSendOption();
    var replyExchage = mqoper.exreply;
    /*
    if (option.appId != cons.serviceName.webserver || (!cons.bIsValidService(deliveryInfo.replyTo, true)) ) {
        replyExchage = mqoper.exreply;
    }else {
        replyExchage = mqoper.exdirect;
    }
    */

    if(replyExchage)
    {
        var pubOption = {};
        pubOption.appId = option.appId;
        if (deliveryInfo.messageId != undefined) {
            pubOption.messageId = deliveryInfo.messageId;
        }

        // http请求分段统计
        if (deliveryInfo.correlationId != undefined) {
            pubOption.correlationId = deliveryInfo.correlationId;
            monitor.httpSectTime(deliveryInfo.correlationId, monitor.sectMark.reply);
        }

        try {
            replyExchage.publish(deliveryInfo.replyTo, msg, pubOption);
            console.log((new Date()) + ' [MQHD]Reply message to %s success by %s.', deliveryInfo.replyTo, replyExchage.name);
            console.log('  message: %s', msg);
            console.log('  key/option = %s/%s.', deliveryInfo.replyTo, JSON.stringify(pubOption));
        }
        catch(err) {
            console.error((new Date()) + ' [MQHD]Reply message to %s failed with error: %s', deliveryInfo.replyTo, err);
        }
    }
    else
    {
        console.error("[MQHD]Exchange "+replyExchage.name+" not around now!");
    }
};

function procMqKeepalive() {
    var key = "mq_keepalive";
    var msg = "keep alive.";
    mqoper.sendMsg(key, msg);
}

/*
 * serviceName: Cloud plat stated service name (stated in util/wconf.js)
 * recvCallback: callback for subscribed request msg
 *
 * Description: Connect to MQ ready for services
 * recvCallback eg:
function(message, header, deliveryInfo) {
    if (message.data) {
        var msg = message.data.toString();

        process received msg...

        assemble reply msg...
        reply msg through MQ:
        replyMsg(replyMsg, deliveryInfo)
    }
}
 * */
MqOper.prototype.connectReadyForService = function (serviceName, recvCallback) {
    if (!cons.bIsValidService(serviceName)) {
        return this.connection = null;
    }

    var mqOption = this._genConnectOption(serviceName);

    // set 'replyTo' for reply queue name
    this.setSendOption('appId', serviceName);
//    this.setSendOption('replyTo', serviceName);
    this.setSendOption('replyTo', basic.getLocalIP('eth', 'IPv4') + ':' + process.pid);

    var connect = amqp.createConnection(mqOption);
    connect.on('ready', function() {
        console.log((new Date()) + ' [MQHD]Connect to MQ for %s is ready: %s', serviceName, JSON.stringify(mqOption));

        mqoper.exdirect = connect.exchange(cons.exchangeParas.exRequest, cons.exchangeParas.exDirOption);   /* 声明 */
        mqoper.exreply  = connect.exchange(cons.exchangeParas.exResponse, cons.exchangeParas.exDirOption);

        connect.queue(serviceName, cons.queueParas.qOption, function (q1) {
            console.log("[MQHD]Queue "+serviceName+" for request is open.");
            q1.bind(cons.exchangeParas.exRequest, serviceName);
            q1.subscribe(function(message, header, deliveryInfo) {
                // http请求分段统计
                if (deliveryInfo.correlationId != undefined) {
                    monitor.httpSectTime(deliveryInfo.correlationId, monitor.sectMark.take);
                }

                recvCallback(message, header, deliveryInfo);
            });
        });
        setInterval(procMqKeepalive, 120000);
    });

    connect.on('error', function (err) {
        console.error("[MQHD]Failed to connect MQ for "+serviceName+' with '+err+', mq option: '+JSON.stringify(mqOption));
    });
    connect.on('end', function (err) {
        console.warn("[MQHD]received end event.");
    });
    connect.on('close', function (err) {
        console.warn("[MQHD]received close event.");
    });

    return this.connection = connect;
};

/*
 * recvCallback: callback for subscribed response msg
 * Description: Connect to MQ ready for services
 * recvCallback eg:
function(message, header, deliveryInfo) {
    if (message.data) {
        var msg = message.data.toString();

        find response obj through deliveryInfo.messageId...

        response msg...
    }
}
 * */
MqOper.prototype.connectReadyForServer = function (recvCallback) {
    var mqOption = this._genConnectOption(cons.serviceName.webserver);

    // set 'replyTo' for reply queue name
    this.setSendOption('appId', cons.serviceName.webserver);
    this.setSendOption('replyTo', basic.getLocalIP('eth', 'IPv4') + ':' + process.pid);

    var connect = amqp.createConnection(mqOption);
    connect.on('ready', function() {
        console.log((new Date()) + ' [MQHD]Connect to MQ for %s is ready: %s', cons.serviceName.webserver, JSON.stringify(mqOption));

        mqoper.exdirect = connect.exchange(cons.exchangeParas.exRequest, cons.exchangeParas.exDirOption);
        mqoper.exreply  = connect.exchange(cons.exchangeParas.exResponse, cons.exchangeParas.exDirOption);   /* 声明 */

        var pOption = mqoper.getSendOption();
        connect.queue(pOption.replyTo, cons.queueParas.qOption, function (q1) {
            console.log("[MQHD]Queue "+pOption.replyTo+" for reply is open.");
            q1.bind(cons.exchangeParas.exResponse, pOption.replyTo);
            q1.subscribe(function(message, header, deliveryInfo) {
                // http请求分段统计
                if (deliveryInfo.correlationId != undefined) {
                    monitor.httpSectTime(deliveryInfo.correlationId, monitor.sectMark.recv);
                }

                recvCallback(message, header, deliveryInfo);
            });
        });
        setInterval(procMqKeepalive, 120000);
    });

    connect.on('error', function (err) {
        console.error('[MQHD]Failed to connect MQ for webserver with '+err+', mq option: '+JSON.stringify(mqOption));
    });
    connect.on('end', function (err) {
        console.warn("[MQHD]received end event.");
    });
    connect.on('close', function (err) {
        console.warn("[MQHD]received close event.");
    });

    return this.connection = connect;
};

/*
 * qName: queue name
 * qOption: queue option, optional parameter
 *          if doesn't provide then user the default
 * Description: declare queue, if queue doesn't exists then create it
 * */
MqOper.prototype.queueDeclare = function (qName, qOption) {
    var tmpOption = qOption;
    if (1 == arguments.length) {
        tmpOption = cons.queueParas.qOption;
    }

    try {
        mqoper.connection.queue(qName, tmpOption);   /* 声明 */
    } catch(err) {
        console.error('[MQHD]Failed to delcare queue '+qName+': '+err.name+', '+err.message);
    }
};


var mqoper = module.exports = new MqOper;
