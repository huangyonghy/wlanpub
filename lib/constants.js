/**
 * Created by Juneja on 2015/9/10.
 *
 * Description:
 *     common constants such as: rabbitMQ parameters include names and options for exchanges&queues,
 *         service index, MIME type, and so on;
 *     basic methods for check validity such as: servicename validity, ...
 */

module.exports = cons = {
    "exchangeParas" : Object.freeze({
        "exRequest"   : "ex_direct",
        "exResponse"  : "ex_reply",
        "exDirOption" : {
            "type"       : "direct",
            "durable"    : false,
            "autoDelete" : true
        }
    }),

    "queueParas" : Object.freeze({
        "qOption" : {
            "durable"   : false,
            "exclusive" : false
        }
    }),

    "serviceName" : Object.freeze({
        "base"                    : "base",                    // 设备管理
        "app"                     : "app",                     // 小贝
        "appchat"                 : "appchat",                 // 小贝聊聊
        "health"                  : "health",                  // 小贝健康
        "spiritapp"               : "spiritapp",               // 关于小贝
        "friendserver"            : "friendserver",            // 小贝好友管理
        "chatserver"              : "chatserver",              // 小贝聊聊v2.0
        "groupserver"             : "groupserver",             // 小贝群组管理
        "maintenance"             : "maintenance",             // 云维护
        "devmonitor"              : "devmonitor",              // 设备监控
        "apmonitor"               : "apmonitor",               // ap监控
        "stamonitor"              : "stamonitor",              // sta监控
        "portalmonitor"           : "portalmonitor",           // portal监控
        "clientprobe_client"      : "clientprobe_client",      // 基于用户的无线探针
        "clientprobe_ap"          : "clientprobe_ap",          // 基于AP的无线探针
        "dpi_app"                 : "dpi_app",                 // 深度包检测app
        "dpi_url"                 : "dpi_url",                 // 深度包检测url
        "nat_detect"              : "nat_detect",              // 私接代理检测
        "wips_client"             : "wips_client",             // 入侵检测client
        "wips_ap"                 : "wips_ap",                 // 入侵检测ap
        "wips_statistics"         : "wips_statistics",         // 入侵检测statistic
        "confmgr"                 : "confmgr",                 // 配置管理
        "rrmserver"               : "rrmserver",               // 射频资源管理
        "diagnosis"               : "diagnosis",               // 在线诊断
        "byod"                    : "byod",                    // 自带设备办公
        "wloc_clientsite"         : "wloc_clientsite",         // 无线定位
        "wmmserver"               : "wmmserver",               // 无线多媒体
        "wloc_map"                : "wloc_map",                // 无线定位地图
        "rollback"                : "rollback",                // 配置回滚
        "stamgr"                  : "stamgr",                  // station管理模块
        "devlocation"             : "devlocation",             // 设备定位
        "wechatnotify"            : "wechatnotify",            // 设备故障微信通知
        "logmgr"                  : "logmgr",                  // 日志管理
        "pagestat"                : "pagestat",                // 页面统计
        "stahistory"              : "stahistory",              // 终端历史信息
        "apmgr"                   : "apmgr",                   // ap管理模块
        "dpi_signature"           : "dpi_signature",           // 应用特征库
        "fsserver"                : "fsserver",                // 查看整个设备信息的文件服务
        "visitor"                 : "visitor",                 // app访客管理
        "feedback"                : "feedback",                // app用户反馈
        "devlogserver"            : "devlogserver",            // 设备告警微服务
        "healthdata"              : "healthdata",              // 健康度数据计算
        "minihealth"              : "minihealth",              // 小小贝健康度
        "aphistory"               : "aphistory",               // AP历史信息
        "probeclient"             : "probeclient",             // 探针Client
        "probeap"                 : "probeap",                 // 探针AP
        "rrmcompute"              : "rrmcompute",              // rrm计算微服务
        "wloc_clientsave"         : "wloc_clientsave",         // 无线定位设备上报信息保存
        "webdoc"                  : "webdoc",                  // 管理web接口文档
        "devmgr"                  : "devmgr",                  // 设备管理模块
        "ssidmgr"                 : "ssidmgr",                 // 服务模块管理
        "ssidmonitor"             : "ssidmonitor",             // 服务模块监控
        "read_dpi_app"            : "read_dpi_app",            // 读 深度包检测APP
        "read_dpi_url"            : "read_dpi_url",            // 读 深度包检测URL
        "read_wips_ap"            : "read_wips_ap",            // 读 入侵检测ap
        "read_wips_client"        : "read_wips_client",        // 读 入侵检测client
        "read_wips_statistics"    : "read_wips_statistics",    // 读 入侵检测statistics
        "read_probeap"            : "read_probeap",            // 读 探针AP
        "read_probeclient"        : "read_probeclient",        // 读 探针Client
        "wloc_clientread"         : "wloc_clientread",         // 读 设备上报的定位信息
        "diagnosis_read"          : "diagnosis_read",          // 读 在线诊断信息
        "rrmwrite"                : "rrmwrite",                // 写 rrm数据保存

        /* specially for MQ keep alive */
        "mq_keepalive"            : "mq_keepalive",            // MQ连接保活用
        /* specially for webserver */
        "webserver"               : "webserver"
    }),
    "serviceIdx" : Object.freeze({
        "base"                    : 0,
        "app"                     : 1,
        "appchat"                 : 2,
        "health"                  : 3,
        "spiritapp"               : 4,
        "friendserver"            : 5,
        "chatserver"              : 6,
        "groupserver"             : 7,
        "maintenance"             : 8,
        "devmonitor"              : 9,
        "apmonitor"               : 10,
        "stamonitor"              : 11,
        "portalmonitor"           : 12,
        "clientprobe_client"      : 13,
        "clientprobe_ap"          : 14,
        "dpi_app"                 : 15,
        "dpi_url"                 : 16,
        "nat_detect"              : 17,
        "wips_client"             : 18,
        "wips_ap"                 : 19,
        "wips_statistics"         : 20,
        "confmgr"                 : 21,
        "rrmserver"               : 22,
        "diagnosis"               : 23,
        "byod"                    : 24,
        "wloc_clientsite"         : 25,
        "wmmserver"               : 26,
        "wloc_map"                : 27,
        "rollback"                : 28,
        "stamgr"                  : 29,
        "devlocation"             : 30,
        "wechatnotify"            : 31,
        "logmgr"                  : 32,
        "pagestat"                : 33,
        "stahistory"              : 34,
        "apmgr"                   : 35,
        "dpi_signature"           : 36,
        "fsserver"                : 37,
        "visitor"                 : 38,
        "feedback"                : 39,
        "devlogserver"            : 40,
        "healthdata"              : 41,
        "minihealth"              : 42,
        "aphistory"               : 43,
        "probeclient"             : 44,
        "probeap"                 : 45,
        "rrmcompute"              : 46,
        "wloc_clientsave"         : 47,
        "webdoc"                  : 48,
        "devmgr"                  : 49,
        "ssidmgr"                 : 50,
        "ssidmonitor"             : 51,
        "read_dpi_app"            : 52,
        "read_dpi_url"            : 53,
        "read_wips_ap"            : 54,
        "read_wips_client"        : 55,
        "read_wips_statistics"    : 56,
        "read_probeap"            : 57,
        "read_probeclient"        : 58,
        "wloc_clientread"         : 59,
        "diagnosis_read"          : 60,
        "rrmwrite"                : 61,

        /* specially for MQ keep alive */
        "mq_keepalive"            : 100,
        /* specially for webserver */
        "webserver"               : 101
    }),
    "bIsValidService" : function (serName, bCloseLog) {
        for (var name in cons.serviceIdx) {
            if (cons.serviceName.webserver == name) {
                if ((bCloseLog === undefined) || (!bCloseLog)) {
                    console.error("[BASIC]Invalid service name: " + serName + "!");
                }

                return false;
            }

            if (serName == name) {
                return true;
            }
        }
    },

    "mimeType" : Object.freeze({
        "txt"  : "text/plain",
        "html" : "text/html",
        "htm"  : "text/html",
        "php"  : "text/html",
        "js"   : "text/javascript",
        "css"  : "text/css",
        "json" : "application/json",
        "ico"  : "image/x-icon",
        "gif"  : "image/gif",
        "jpeg" : "image/jpeg",
        "jpg"  : "image/jpeg",
        "png"  : "image/png",
        "apk"  : "application/vnd.android.package-archive",
        "ipa"  : "application/octet-stream",
        "plist": "application/xml"
    })
};
