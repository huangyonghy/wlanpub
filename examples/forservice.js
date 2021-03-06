/**
 * Created by Juneja on 2015/9/12.
 *
 * example for services
 */

var mqhd   = require('../wlanpub').mqhd,
    basic  = require('../wlanpub').basic;

/* Important parameters, Need to modify according to the actual situation
 * 为了方便修连接参数，建议将各种服务的连接选项放在入口文件里，便于调测
 * */
//var MQHostnames = ["21Server", "22Server", "VirtualServer4"];
var MQHostnames = ["22Server"];

/* 测试一下本地冲突怎么解决
 * 若不设置这个，测默认使用微软云上的环境
 * */
/* First --- set hostnames for MQ server cluster
 * 若不设置这个，测默认使用微软云上的环境
 * */
mqhd.setHostnames(MQHostnames);

/*
 * Then --- Realize the callback function for subscribe message
 * 1、该回调函数原型固定的，为RabbitMQ中订阅消息的回调函数原型
 * 2、包括请求消息的路由处理、组装并回应可视化消息
 * 3、消息格式是约定的, 各域值与request对象的关系:
 *    { 'head'   : request.headers,
 *      'url'    : url.parse(request.url),
 *      'method' : request.method,
 *      'body'   : +chunk(请求消息体) }
 * 4、这是业务处理的总入口，也是使用MQ里要重点实现的
 * */
function procRequestMsg(message, header, deliveryInfo) {
    if (message.data) {
        var msgText = message.data.toString();
        var json1   = JSON.parse(msgText);

        var pathname = json1.url.pathname.slice(1);

        /* process received request */
        /* e.g: router.route(pathname, deliverInfo) */

        /*    assemble reply msg and reply... */
        mqhd.replyMsg("Very nice from wlanpub example for services.", deliveryInfo);
    }
};


mqhd.connectReadyForService(basic.serviceName.portal, procRequestMsg);

/* The end. */
