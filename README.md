<https://www.npmjs.com/package/wlanpub>
<https://github.com/JunejaTung/wlanpub>
# wlanpub - WLAN Public module for Cloud Plat.

## Contents
- [Synopsis](#synopsis)
- [Usage](#usage)
  - [Install](#install)
  - [Steps](#steps)
- [Mqhd](#mqhd)
  - [mqhd.setHostnames(MQHostnames)](#mqhd-sethostnames-mqhostnames)
  - [mqhd.getHostnames()](#mqhd-gethostnames)
  - [mqhd.setSendOption(key, value)](#mqhd-getsendoption-key-value)
  - [mqhd.getSendOption([key])](#mqhd-getsendoption-key)
  - [mqhd.sendMsg(pkey, msg[, pubOption])](#mqhd-sendmsgp-key-msg--puboption)
  - [mqhd.replyMsg(msg, deliveryInfo)](#mqhd-replymsg-msg-deliveryinfo)
  - [mqhd.connectReadyForService(serviceName, recvCallback)](#mqhd-connectreadyforservice-servicename-recvcallback)
  - [mqhd.connectReadyForServer(recvCallback)](#mqhd-connectreadyforserver-recvcallback)
  - [mqhd.connection](#mqhd-connection)
  - [mqhd.exdirect](#mqhd-exdirect)
  - [mqhd.exreply](#mqhd-exreply)
- [Dbhd](#dbhd)
  - [dbhd.connectRedis([redisPara])](#dbhd-connectredis-redispara)
  - [dbhd.connectMongoose([mongoosePara])](#dbhd-connectmongoose-mongoosepara)
  - [dbhd.connectDatabase([redisPara, mongoosePara])](#dbhd-connectdatabase-redispara-mongoosepara)
  - [dbhd.redisClient](#dbhd-redisclient)
  - [dbhd.mongo](#dbhd-mongo)
  - [dbhd.Schema](#dbhd-schema)
- [Basic](#basic)
  - [basic.mimeType](#basic-mimetype)
  - [basic.serviceName](#basic-servicename)
  - [basic.bIsValidService(serviceName)](#basic-bisvalidservice-servicename)
  - [basic.getLocalIP(iftype, family)](#basic-getlocalip-iftype-family)
  - [basic.mkdirsSync(dirpath, mode)](#basic-mkdirssync-dirpath-mode)
  - [basic.mkdirs(dirpath, mode, callback)](#basic-mkdirs-dirpath-mode-callback)
  - [basic.trimSpaces(str)](#basic-trimspaces-str)
- [Monitor](#monitor)
  - [monitor.client](#monitor-client)
  - [monitor.redisClient](#monitor-redisclient)
  - [monitor.createProcessStats(moduleName, redisPara)](#monitor-createprocessstats-modulename-redispara)
  - [monitor.accessStats(request, response, next)](#monitor-accessstats-request-response-next)
- [MQServer](#mqserver)

## Synopsis
wlanpub为云平台公共模块，提供一些公共属性方法，包括mqhd、basic、dbhd、monitor等独立的子模块。    
basic实现部分常见系统调用封装，mimeType、serviceName等常量定义；    
mqhd实现对RabbitMQ的基本封装，如RabbitMQ（简称MQ）的单播连接、收发操作等；    
dbhd实现对数据库的访问，即提供连接数据库的操作；    
monitor实现对业务访问统计、进程基本信息等数据的提取和存储到redis。

## Usage

### Install
    npm install -g wlanpub
### Steps
以业务端使用该库来举例，请按照以下步骤操作。     
0.请首先检查将要使用的MIME type、业务名、MQServer用户名是否存在：    
  查看`basic.mimeType`属性内容，确定是否需要新增MIME type；    
  查看`basic.serviceName`属性内容，确定即将采用的业务名是否需要评审添加；    
  若需要新增或修改任何约定属性内容，请通知负责人更新公共模块。    
  MQServer用户名检查及增加流程参考后面[MQServer](https://www.npmjs.com/package/wlanpub#mqserver)节。

1.加载wlanpub库：

    var basic = require('wlanpub').basic,
        mqhd  = require('wlanpub').mqhd,
        dbhd  = require('wlanpub').dbhd,
        monit = require('wlanpub').monitor;
如果只使用其中的某个子模块，单独加载该子模块即可，不用全部加载。    
一些系统调用、参数常量等使用basic子模块；MQ相关属性方法可以使用mqhd子模块；数据库相关的请使用dbhd子模块；业务监控相关的请使用monitor子模块。

2.如果使用mqhd子模块：    
  1)首先在模块入口处设置MQServer的服务器名列表，如果不设置，默认使用微软云上的环境:    

    var MQHostnames = ["h3crd-wlan1", "h3crd-wlan2"];
    mqhd.setHostnames(MQHostnames);
  2)创建MQ连接，其中recvMqMsg为自定义的处理MQ消息的回调函数：    
    mqhd.connectReadyForService(basic.serviceName.base, recvMqMsg);    
  	recvMqMsg可以参考如下实现：    
  	**请注意：如果通过MQ发送的是http消息，请务必在mq消息里定义url字段，以此来区分是否为http消息.**

    function recvMqMsg(message, header, deliveryInfo) {
	    if (message.data) {
	        var recvData = JSON.parse(message.data);
	        console.log((new Date()) + ' Received mq message from %s: %s', deliveryInfo.appId, message.data);
	        console.log('  deliveryInfo: ' + JSON.stringify(deliveryInfo));
	        if (recvData.url != undefined) {
	            procWsMsg(recvData, deliveryInfo);
	        }else {
	            console.warn('  unknown message. please check it...');
	        }
	    }else {
	        console.warn('The message format is not supported, please check it where the message is send...');
	        console.warn('  message: ' + JSON.stringify(message));
	        console.warn('  message.data: ' + message.data);
	    }
    }

3.如果使用dbhd子模块，请首先在模块入口处设置连接数据库参数，如果不设置，默认使用微软云上的环境：    
    如果需要同时使用redis和mongoose数据库，请调用以下接口：    
        dbhd.connectDatabase({'port':6379, 'host':'192.168.110.34'}, 'mongodb://admin:admin@192.168.110.33:40000/lyytest');    
    如果只使用redis数据库，请调用以下接口：    
        dbhd.connectRedis({'port':6379, 'host':'192.168.110.34'});    
    如果只使用mongoose数据库，请调用以下接口：    
        dbhd.connectMongoose('mongodb://admin:admin@192.168.110.33:40000/lyytest');    

4.进行业务进程基本信息监控，需在能方便设置Redis连接参数的文件中使用如下接口，若不设置`redisPara`参数，则默认使用微软云上的环境：   
    
    monit.createProcessStats(basic.serviceName.spiritapp, redisPara);

## Mqhd
基于[postwait/node-amqp](https://www.npmjs.com/package/amqp)开源库，将创建连接、exchange和queue的创建等细节进行封装私有化，只暴露一些必要的属性和方法，比如连接、收发exchange等对象，MQ连接服务和收发消息等方法。

### mqhd.setHostnames(MQHostnames)
函数功能：用于设置MQServer服务器名列表。    
参数介绍：`MQHostnames`为一数组对象，元素可以是主机名也可是IP地址。    
默认情形：若不设置MQ服务器名参数，则*默认使用微软云上的环境即["h3crd-wlan1", "h3crd-wlan2"]*。    
注意事项：若在一套云平台系统上有多个MQServer，`mqhd`的连接服务接口会尽量将各业务的连接均衡分配到各MQServer上。

### mqhd.getHostnames()
函数功能：用于获取当前系统所用的MQServer服务器名列表。返回MQ服务器名数组对象。

### mqhd.setSendOption(key, value)
函数功能：用于设置发送消息到MQ的publish选项。    
参数介绍：`key`为选项名, `value`为选项`key`对应的值。key目前用到了replyTo、messageId、appId三个字段选项，其它选项参考postwait/node-amqp开源库中
          [exchange.publish(routingKey, message, options, callback)](https://www.npmjs.com/package/amqp#exchangepublishroutingkey-message-options-callback)的介绍，后面提到的也一样。

### mqhd.getSendOption([key])
函数功能：用于获取发送消息到MQ的publish选项值。    
参数介绍：`key`为选项名, 返回选项`key`对应的值。若不带参数，则将所有选项值对返回，形如{ 'replyTo' : '', 'messageId'  : '', 'appId' : '' }。

### mqhd.sendMsg(pkey, msg[, callback])
函数功能：用于发送MQ消息，webserver端和业务端都可以使用该接口主动发送MQ消息。    
参数介绍：`pkey`为云平台业务名。        
         `msg`为发送的数据，形如：JSON.stringify(sendMsg)，且其中的sendMsg必须为JSON数据格式，且sendMsg必须包含url字段。    
	 `callback`为自定义的回调函数，用来处理从MQ接收到的消息。callback的参数为jsonData,是后台业务发过来的JSON数据，具体实现示例如下。 
	    
    function(jsonData) {
        console.log('  render get msg...');
        delete jsonData.url;
        res.write(JSON.stringify(jsonData));
        res.end();
        console.log('  response data: ' + JSON.stringify(jsonData));
    }
**注意事项：如果是webserver端调用该接口发送从http收到的消息，则callback参数必填，其它情况callback参数不必填。**

### mqhd.replyMsg(msg, deliveryInfo)
函数功能：用于回应消息到MQ。    
参数介绍：`msg`为需要回应的消息内容, 消息内容自定义，但须形如：JSON.stringify(sendMsg)，且其中的sendMsg必须为JSON数据格式，且sendMsg必须包含url字段。   
         `deliverInfo`：来源不用业务端感知，为订阅消息回调函数的第三个入参直接透传给`replyMsg`即可。    
注意事项：具体详情参考接下来对`mqhd.connectReadyForService`方法的介绍。

### mqhd.connectReadyForService(serviceName, recvCallback)
函数功能：用于云平台业务连接MQServer并向业务队列订阅消息, 业务端需要在该回调函数中处理订阅到的消息，并通过`mqhd.replyMsg`方法应答消息。        
参数介绍：`serviceName`为云平台业务名，需确保是评审过的，具体参考`basic.serviceName`属性内容。        
         `recvCallback`为订阅消息的回调函数，可以参考*base*业务如下实现：    
**请注意：如果通过MQ发送的是http消息，请务必在mq消息里定义url字段，以此来区分是否为http消息.**

    function recvMqMsg(message, header, deliveryInfo) {
        if (message.data) {
            var recvData = JSON.parse(message.data);
            console.log((new Date()) + ' Received mq message from %s: %s', deliveryInfo.appId, message.data);
            console.log('  deliveryInfo: ' + JSON.stringify(deliveryInfo));
            if (recvData.url != undefined) {
                procWsMsg(recvData, deliveryInfo);
            }else {
                console.warn('  unknown message. please check it...');
            }
        }else {
            console.warn('The message format is not supported, please check it where the message is send...');
            console.warn('  message: ' + JSON.stringify(message));
            console.warn('  message.data: ' + message.data);
        }
    }

### mqhd.connectReadyForServer(recvCallback)
函数功能：用于webserver连接MQServer并向应答队列订阅消息, webserver端需要在该回调函数中处理订阅到的消息。    
参数介绍：`recvCallback`为订阅消息的回调函数。

### mqhd.connection
`connection`属性为当前MQ连接对象。

### mqhd.exdirect
`exdirect`属性为当前webserver端发送request消息到MQ所使用的exchange对象，当然也是云平台业务接收请求消息的。

### mqhd.exreply
`exreply`属性为当前云平台业务端发送response消息到MQ所使用的exchange对象，当然也是webserver接收应答消息的。

## Dbhd
基于*redis*数据库和*mongoose*数据库进行封装。主要封装连接上述两个数据库的一些接口。

### dbhd.connectRedis(redisPara)
函数功能：用来连接*redis*数据库。    
参数介绍：`redisPara`为连接*redis*数据库的参数。为JSON格式，形如：`{'port':6379, 'host':'192.168.110.34'}`，其中`port`用来指定端口号，`host`用来指定数据库所在的主机名或IP地址。    
默认情形：如果不携带`redisPara`参数，则默认连接到微软云上的*redis*数据库。

### dbhd.connectMongoose(mongoosePara)
函数功能：用来连接*mongoose*数据库。    
参数介绍：`mongoosePara`为连接*mongoose*数据库的参数。为字符串格式，形如：`mongodb://admin:admin@192.168.110.33:40000/WLAN`。    
默认情形：如果不携带`mongoosePara`参数，则默认连接到微软云上的*mongoose*数据库。

### dbhd.connectDatabase(redisPara, mongoosePara)
函数功能：用来连接*redis*数据库和*mongoose*数据库。    
参数介绍：`redisPara`和`mongoosePara`分别见方法`connectRedis`和`connectMongoose`的介绍，不再赘述。    
默认情形：同上。

### dbhd.redisClient
该属性为连接*redis*数据库的句柄对象。

### dbhd.mongo
该属性为连接*mongoose*数据库的句柄对象。

### dbhd.Schema
该属性等同于`require('mongoose').Schema`，为`mongoose`的Schema句柄。**若要使用Schema请务必使用该模块暴露出的Schema属性，不要自行`require`出**。

## Basic
包括一些系统接口封装，如获取本机地址、创建多级目录、空格转换等；    
云平台主要服务常用参数，如MIME Type、云平台业务名、MQ相关选项等常量。

### basic.mimeType
`mimeType`属性定义了MIME类型，具体内容参考本模块文件`wlanpub/lib/constants.js`。    
该属性虽然是webserver端使用， 但**云平台业务端需要重点关注是否没有业务需要的类型**，若要新增类型，请通知公共模块负责人更新。

### basic.serviceName
`serviceName`属性约定了云平台业务名，具体参考云平台业务相关设计文档，该属性用处很多**云平台业务端也需要重点关注**。    
  用处：`url.path`属性第一个单词，request消息的MQ队列名及routingKey，MQ服务器的用户名等。    
  已经评审过的业务名名单参考本模块文件`wlanpub/lib/constants.js`。

### basic.bIsValidService(serviceName)
用于校验`serviceName`是否合法的即是否约定的，若不存在则需要通知公共模块负责人更新。

### basic.getLocalIP(iftype, family)
用于获取指定网卡类型的ipv4或ipv6地址，若指定类型有多个接口默认取第一个的地址。    
  `iftype`为网卡类型，如eth, lo, tunl。    
  `family`为地址协议类型，IPv4 or IPv6。    
  常用方式：`basic.getLocalIP('eth', 'IPv4')`。

### basic.mkdirsSync(dirpath, mode)
用于同步创建多级目录，其异步版见`basic.mkdirs(dirpath, mode)`。    
  `dirpath`为待创建的多级目录名。    
  `mode`为目录权限设置如0775、0777。

### basic.mkdirs(dirpath, mode, callback)
用于异步创建多级目录，其同步版见`basic.mkdirs(dirpath, mode)`。    
  `dirpath`为待创建的多级目录名。    
  `mode`为目录权限设置如0755、0777。    
  `callback`为创建完后的回调函数。

### basic.trimSpaces(str)
用于将字符串中`str`多个空格转换成一个空格，主要用于格式化行输出获取指定栏目的值。    
  常用方式：`tmp = trim(stdout).split(' ')`, 然后`tmp`是个数组对象。

## Monitor
实现业务访问统计、云端模块进程基本信息等数据的提取存储。业务访问统计包括请求和回应累计，进程基本信息包括模块所在位置及其近期的CPU内存使用率，
这些数据均存储到redis。
  
### monitor.client
监控子模块依赖于`node_ranaly`库实现带时间戳数据的保存，`client`属性为该库的实例化。   

### monitor.redisClient
`redisClient`属性为redis服务的连接对象。    

### monitor.createProcessStats(moduleName, redisPara)
为模块`moduleName`创建监控收集进程基本信息的客服端，会采用`redisPara`创建用于存储数据的redis连接。   
  `moduleName`为云端模块名，为`webserver`或已评审的业务微服务名。    
  `redisPara`为redis连接参数，可选。若不设置，则默认使用微软云的redis服务。   
  
### monitor.accessStats(request, response, next)
通过`express`路由中间件形式实现业务访问统计并存储到已连接到的redis数据库中。函数原型为`express`实例`app.use`方法的入参形式。   
  `request`为HTTP请求对象。    
  `response`为HTTP回应对象。   
  `next`即`express`框架里的next()方法。  

## MQServer
连上MQServer服务器上，按以下步骤操作。    
1.检查将要使用的用户名是否存在
## MQServer
连上MQServer服务器上，按以下步骤操作。    
1.检查将要使用的用户名是否存在
## MQServer
连上MQServer服务器上，按以下步骤操作。    
1.检查将要使用的用户名是否存在

    sudo rabbitmqctl list_users
2.若不存在，请新增以业务名命名的账号信息

    sudo rabbitmqctl add_user serviceName 123456
    sudo rabbitmqctl set_user_tags serviceName administrator
    sudo rabbitmqctl set_permissions -p / serviceName ".*" ".*" ".*"
也可以在MQ管理页面的首页--->Admin中操作，管理页面访问方法：MQServerIPaddr:15672。        
