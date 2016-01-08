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
        // 过渡
        "wlan_clientprobe_client" : "wlan_clientprobe_client", // 基于用户的无线探针
        "wlan_clientprobe_ap"     : "wlan_clientprobe_ap",     // 基于AP的无线探针
        "wlan_dpi_app"            : "wlan_dpi_app",            // 深度包检测app
        "wlan_dpi_url"            : "wlan_dpi_url",            // 深度包检测url
        "wlan_nat_detect"         : "wlan_nat_detect",         // 私接代理检测
        "wlan_wips_client"        : "wlan_wips_client",        // 入侵检测client
        "wlan_wips_ap"            : "wlan_wips_ap",            // 入侵检测ap
        "wlan_wips_statistics"    : "wlan_wips_statistics",    // 入侵检测statistic

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
        // 过渡
        "wlan_clientprobe_client" : 13,
        "wlan_clientprobe_ap"     : 14,
        "wlan_dpi_app"            : 15,
        "wlan_dpi_url"            : 16,
        "wlan_nat_detect"         : 17,
        "wlan_wips_client"        : 18,
        "wlan_wips_ap"            : 19,
        "wlan_wips_statistics"    : 20,

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

        /* specially for webserver */
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
