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
        "maintenance" : "maintenance",  // 云维护
        "app"         : "app",   // 小贝
        "base"        : "base",  // 设备 主连接
        "auth"        : "auth",  // 认证授权
        "report"      : "report",   // 设备信息上报      
        "lbs"         : "lbs",   // 定位
        "tunnel"      : "tunnel",   // VPN隧道
        "imgdownload" : "imgdownload", // 版本下载
        "comm"        : "comm",  // 社区交互
        "portal_developer" : "portal_developer",
        "portal_device"    : "portal_device",
        "portal_customer"  : "portal_customer",
        "portal_app"       : "portal_app",
        "appchat"     : "appchat",  // 小贝聊聊
        "health"      : "health",       // 小贝健康
        "spiritapp"   : "spiritapp",    // 关于小贝
        "friendserver": "friendserver", // 小贝好友管理
        "devmonitor": "devmonitor",     //设备监控模块
        "wlan_clientprobe_client" : "wlan_clientprobe_client", // 基于用户的无线探针
        "wlan_clientprobe_ap"     : "wlan_clientprobe_ap",     // 基于AP的无线探针
        "wlan_dpi_app"         : "wlan_dpi_app",   // 深度包检测app
        "wlan_dpi_url"         : "wlan_dpi_url",   // 深度包检测url
        "wlan_nat_detect"  : "wlan_nat_detect",   // 私接代理检测
        "wlan_wips_client" : "wlan_wips_client",   //入侵检测client
        "wlan_wips_ap"     :"wlan_wips_ap",        //入侵检测ap
        "wlan_wips_statistics":"wlan_wips_statistics", //入侵检测statistic
        "confmgr" : "confmgr",                        //配置管理模块
        "apmonitor": "apmonitor",                     //ap监控模块
        "stamonitor": "stamonitor",                   //sta监控模块
        "rrmserver"  : "rrmserver",      // 射频资源管理微服务
        "chatserver" : "chatserver",     // 小贝聊聊v2.0

        /* specially for webserver */
        "webserver"   : "webserver",
        "general"     : "general",
        "operfile"    : "operfile"
    }),
    "serviceIdx" : Object.freeze({
        "maintenance" : 0,
        "app"         : 1,
        "base"        : 2,
        "auth"        : 3,
        "report"      : 4,
        "lbs"         : 5,
        "tunnel"      : 6,
        "imgdownload" : 7,
        "comm"        : 8,
        "portal_developer" : 9,
        "portal_device"    : 10,
        "portal_customer"  : 11,
        "portal_app"       : 12,
        "appchat"     : 13,
        "health"      : 14,
        "spiritapp"   : 15,
        "friendserver": 16,
        "devmonitor": 17,
        "wlan_clientprobe_client" : 18,
        "wlan_clientprobe_ap"     : 19,
        "wlan_dpi_app"         : 20,
        "wlan_dpi_url"         : 21,
        "wlan_nat_detect"  : 22,
        "wlan_wips_client" : 23,
        "wlan_wips_ap"     : 24,
        "wlan_wips_statistics":25,
        "confmgr" : 26,
        "apmonitor": 27, 
        "stamonitor": 28,
        "rrmserver" : 29,
        "chatserver": 30,
		

        /* specially for webserver */
        "webserver"   : 101,
        "general"     : 102,
        "operfile"    : 103
    }),
    "bIsValidService" : function (serName, bCloseLog) {
        for (var name in cons.serviceIdx) {
        //    console.log(name);
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
