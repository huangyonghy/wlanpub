/**
 * Created by Juneja on 2015/9/7.
 *
 * Description: Common methods for RabbitMQ(github.com/postwait/node-amqp)
 */
"use strict";

var amqp   = require('amqp'),
    cons   = require('./constants');


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
                console.error("Too much parameters for set/get SendOption.");
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
                console.error("Too much parameters for set/get Hostnames.");
        }
    };
    this.getHostnames = this.setHostnames;

    /* private, only for reference */
    var hostnames  = ["h3crd-wlan1", "h3crd-wlan2"];
    var sendOption = {
        "replyTo"        : "",
        "correlationId"  : ""
    };
    var requestMsg = {
        "head"   : "",
        "url"    : "",
        "method" : "",
        "body"   : ""
    };

    /*
     * key: an request msg field for MQ
     * value: optional parameter, if doesn't provide then return key's value
     * description: set/get request msg for webserver to MQ
     * */
    var setRequestMsg = function (key, value) {
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
                console.error("Too much parameters for set/get RequestMsg.");
        }
    };
    var getRequestMsg = setRequestMsg;
}

/*
 * Generate connect option with serviceName
 * */
MqOper.prototype.genConnectOption = function (serviceName) {
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
 * pkey: pblish key
 * msg: msg to send
 * pubOption: publish option, optional parameter
 * Description: publish msg for webserver to MQ,
 *              if don't provide 'pubOption' then use this.sendOption
 * msg format do as { 'head':'', 'url':'', 'method':'', 'body':'' }
 * */
MqOper.prototype.sendMsg = function (pkey, msg, pubOption) {
    var tmpOption = pubOption;
    if (2 == arguments.length) {
        tmpOption = this.getSendOption();
    }

    console.log("Send option: "+JSON.stringify(tmpOption));

    if(this.exdirect)
    {
        try {
            mqoper.exdirect.publish(pkey, msg, tmpOption);
        }
        catch(err) {
            console.error('Failed to send msg: '+err.name+' '+err.message);
        }
    }
    else
    {
        console.error("Exchange "+cons.exchangeParas.exRequest+" not around now!");
    }
};

/*
 * msg: msg to reply
 * deliverInfo: just as subscribed msg's deliverInfo
 * Description: publish msg for services to MQ
 * */
MqOper.prototype.replyMsg = function (msg, deliveryInfo) {
    if(this.exreply)
    {
        var pubOption = {};
        pubOption.correlationId = deliveryInfo.correlationId;

        try {
            mqoper.exreply.publish(deliveryInfo.replyTo, msg, pubOption);
        }
        catch(err) {
            console.error('Failed to reply msg: '+err.name+' '+err.message);
        }
    }
    else
    {
        console.error("Exchange "+cons.exchangeParas.exResponse+" not around now!");
    }
};

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

    var mqOption = this.genConnectOption(serviceName);
    var connect = amqp.createConnection(mqOption);
    connect.on('ready', function() {
        console.log('Connection to MQ for '+serviceName+ ' is ready!');

        mqoper.exdirect = connect.exchange(cons.exchangeParas.exRequest, cons.exchangeParas.exDirOption);   /* 声明 */
        mqoper.exreply  = connect.exchange(cons.exchangeParas.exResponse, cons.exchangeParas.exDirOption);

        connect.queue(serviceName, cons.queueParas.qOption, function (q1) {
            console.log("Queue "+serviceName+" for receive request is open.");
            q1.bind(cons.exchangeParas.exRequest, serviceName);
            q1.subscribe(recvCallback);
        });
    });

    console.log(JSON.stringify(mqOption));

    connect.on('error', function (err) {
        console.error("Failed to connect MQ for "+serviceName+': '+err.name+' '+err.message);
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

        find response obj through deliveryInfo.correlationId...

        response msg...
    }
}
 * */
MqOper.prototype.connectReadyForServer = function (recvCallback) {
    var mqOption = this.genConnectOption(cons.serviceName.webserver);
    var connect = amqp.createConnection(mqOption);
    connect.on('ready', function() {
        console.log('Connection to MQ for webserver is ready!');

        mqoper.exdirect = connect.exchange(cons.exchangeParas.exRequest, cons.exchangeParas.exDirOption);
        mqoper.exreply  = connect.exchange(cons.exchangeParas.exResponse, cons.exchangeParas.exDirOption);   /* 声明 */

        var pOption = mqoper.getSendOption();
        connect.queue(pOption.replyTo, cons.queueParas.qOption, function (q1) {
            console.log("Queue "+pOption.replyTo+" for receive reponse is open.");
            q1.bind(cons.exchangeParas.exResponse, pOption.replyTo);
            q1.subscribe(recvCallback);
        });
    });

    connect.on('error', function (err) {
        console.error('Failed to connect MQ for webserver: '+err.name+' '+err.message);
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
        console.error('Failed to delcare queue '+qName+': '+err.name+' '+err.message);
    }
};


var mqoper = module.exports = new MqOper;
