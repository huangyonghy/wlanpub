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
- [Basic](#basic)
  - [basic.mimeType](#basic-mimetype)
  - [basic.serviceName](#basic-servicename)
  - [basic.bIsValidService(serviceName)](#basic-bisvalidservice-servicename)
  - [basic.getLocalIP(iftype, family)](#basic-getlocalip-iftype-family)
  - [basic.mkdirsSync(dirpath, mode)](#basic-mkdirssync-dirpath-mode)
  - [basic.mkdirs(dirpath, mode, callback)](#basic-mkdirs-dirpath-mode-callback)
  - [basic.trimSpaces(str)](#basic-trimspaces-str)
- [MQServer](#mqserver)

## Synopsis
wlanpub为云平台公共模块，提供一些公共属性方法，包括mqhd和basic两个子模块。    
mqhd实现对RabbitMQ的基本封装，如RabbitMQ的单播连接、收发操作等；basic实现部分常见系统调用封装，mimeType、serviceName等常量定义。后续描述RabbitMQ简称MQ。

## Usage
### Install
    npm install -g wlanpub
### Steps
以业务端使用该库来举例。    
1.加载wlanpub库：

    var mqhd  = require('wlanpub').mqhd,
        basic = require('wlanpub').basic;
若要使用MQ相关属性方法可以使用mqhd子模块，一些系统调用、参数常量等使用basic子模块。

2.检查将要使用的MIME type、业务名、MQServer用户名是否存在：    
  查看`basic.mimeType`属性内容，确定是否需要新增MIME type；    
  查看`basic.serviceName`属性内容，确定即将采用的业务名是否需要评审添加；    
  若需要新增或修改任何约定属性内容，请通知负责人更新公共模块。    
  MQServer用户名检查及增加流程参考后面[MQServer](https://www.npmjs.com/package/wlanpub#mqserver)节。

3.设置MQServer的服务器名列表：

    var MQHostnames = ["h3crd-wlan1", "h3crd-wlan2"];
    mqhd.setHostnames(MQHostnames);

4.实现对订阅到的Request消息进行处理的回调函数：    
  该回调函数原型是固定的，具体参考postwait/node-amqp库里对[queue.subscribe([options,] listener)](https://www.npmjs.com/package/amqp#queue-subscribe-options-listener)的介绍，比如：

    function procRequestMsg(message, header, deliveryInfo) {
        if (message.data) {
            var msgText = message.data.toString();
            var json1   = JSON.parse(msgText);
            var pathname = json1.url.pathname.slice(1);
            // process received request 
            // e.g: router.route(pathname, deliverInfo)
            // assemble reply msg and reply...
            mqhd.replyMsg("Very nice from wlanpub example for services.", deliveryInfo);
        }
    };

5.创建MQ连接，并传人前面实现的回调函数：

    mqhd.connectReadyForService(basic.serviceName.portal, procRequestMsg);

## Mqhd
基于[postwait/node-amqp](https://www.npmjs.com/package/amqp)开源库，将创建连接、exchange和queue的创建等细节进行封装私有化，只暴露一些必要的属性和方法，比如连接、收发exchange等对象，MQ连接服务和收发消息等方法。

### mqhd.setHostnames(MQHostnames)
用于设置MQServer服务器名列表。    
`MQHostnames`为一数组对象，元素可以是主机名也可是IP地址。若不设置MQ服务器名参数，则*默认使用微软云上的环境即
["h3crd-wlan1", "h3crd-wlan2"]*。    
若在一套云平台系统上有多个MQServer，`mqhd`的连接服务接口会尽量将各业务的连接均衡分配到各MQServer上。

### mqhd.getHostnames()
用于获取当前系统所用的MQServer服务器名列表。    
返回MQ服务器名数组对象。

### mqhd.setSendOption(key, value)
用于设置webserver端发送消息到MQ的publish选项。    
目前只用到**replyTo、correlationId**两个选项，其它选项参考postwait/node-amqp开源库中
[exchange.publish(routingKey, message, options, callback)](https://www.npmjs.com/package/amqp#exchangepublishroutingkey-message-options-callback)的介绍，后面提到的也一样。   
`key`为选项名, `value`为选项`key`对应的值。

### mqhd.getSendOption([key])
用于获取webserver端发送消息到MQ的publish选项值。    
`key`为选项名, 返回选项`key`对应的值。    
若不带参数，则将所有选项值对返回，形如{ 'replyTo' : '', 'correlationId'  : '' }。

### mqhd.sendMsg(pkey, msg[, pubOption])
用于webserver端发送消息到MQ。    
`pkey`为云平台业务名。    
`msg`为http request解析出的头体内容, 消息格式**约定为{ 'head':'', 'url':'', 'method':'', 'body':'' }**，
各域值与http request对象的关系：

    {
       'head'   : request.headers,
       'url'    : url.parse(request.url),
       'method' : request.method,
       'body'   : +chunk(请求消息体)
    }
`pubOption`可选参数，为发送时的publish选项，目前只用到`{ 'replyTo' : '', 'correlationId'  : '1' }`。默认采用`mqhd`中
  被动态设置的值,即`mqhd.getSendOption()`。

### mqhd.replyMsg(msg, deliveryInfo)
用于云平台业务端回应消息到MQ。    
`msg`为业务端需要回应的消息内容, 消息格式自定义。    
`deliverInfo`来源不用业务端感知，为订阅消息回调函数的第三个入参直接透传给`replyMsg`即可。    
 具体详情参考接下来对`mqhd.connectReadyForService`方法的介绍。

### mqhd.connectReadyForService(serviceName, recvCallback)
用于云平台业务连接MQServer并向业务队列订阅消息, 参数`recvCallback`为订阅消息的回调函数，
  业务端需要在该回调函数中处理订阅到的消息，并通过`mqhd.replyMsg`方法应答消息。    
`serviceName`为云平台业务名，需确保是评审过的，具体参考`basic.serviceName`属性内容。    
`recvCallback`函数原型约定如下：

    function(message, header, deliveryInfo) {
        if (message.data) {
            var msg = message.data.toString();
            // process received msg... 
            // assemble your reply msg...
            // reply msg through MQ
            mqhd.replyMsg(yourMsg, deliveryInfo);
        }
    };

### mqhd.connectReadyForServer(recvCallback)
用于webserver连接MQServer并向应答队列订阅消息, 参数`recvCallback`为订阅消息的回调函数，
  webserver端需要在该回调函数中处理订阅到的消息，并将订阅到的应答消息回复给前端。    
`recvCallback`函数原型约定如下：

    function(message, header, deliveryInfo) {
        if (message.data) {
            var msgText = message.data.toString();
            var resObj  = resMap.get(deliveryInfo.correlationId);
            resObj.write(msgText);
            resObj.end();
        }
    };

### mqhd.connection
`connection`属性为当前MQ连接对象。

### mqhd.exdirect
`exdirect`属性为当前webserver端发送request消息到MQ所使用的exchange对象，当然也是云平台业务接收请求消息的。

### mqhd.exreply
`exreply`属性为当前云平台业务端发送response消息到MQ所使用的exchange对象，当然也是webserver接收应答消息的。

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
  常用方式：`basic.getLocalIP(eth, IPv4)`。

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

## MQServer
连上MQServer服务器上，按以下步骤操作。     
1.检查将要使用的用户名是否存在

    sudo rabbitmqctl list_users
2.若不存在，请新增以业务名命名的账号信息

    sudo rabbitmqctl add_user serviceName 123456
    sudo rabbitmqctl set_user_tags serviceName administrator
    sudo rabbitmqctl set_permissions -p / serviceName ".*" ".*" ".*"
也可以在MQ管理页面的首页--->Admin中操作，管理页面访问方法：MQServerIPaddr:15672。        
建议采用上面的命令行方式操作。
