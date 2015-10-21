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
        "clientprobe_client" : "clientprobe_client", // 基于用户的无线探针
        "clientprobe_ap"     : "clientprobe_ap",     // 基于AP的无线探针
        "lbs"         : "lbs",   // 定位
        "tunnel"      : "tunnel",   // VPN隧道
        "imgdownload" : "imgdownload", // 版本下载
        "comm"        : "comm",  // 社区交互
        "portal_developer" : "portal_developer",
        "portal_device"    : "portal_device",
        "portal_customer"  : "portal_customer",
        "portal_app"       : "portal_app",
        "dpi"         : "dpi",   // 深度包检测
        "nat_detect"  : "nat_detect",   // 私接代理检测
        "appchat"     : "appchat",  // 小贝聊聊
        "health"      : "health",       // 小贝健康
        "spiritapp"   : "spiritapp",    // 关于小贝
        "friendserver": "friendserver", // 小贝好友管理

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
        "clientprobe_client" : 5,
        "clientprobe_ap"     : 6,
        "lbs"         : 7,
        "tunnel"      : 8,
        "imgdownload" : 9,
        "comm"        : 10,
        "portal_developer" : 11,
        "portal_device"    : 12,
        "portal_customer"  : 13,
        "portal_app"       : 14,
        "dpi"         : 15,
        "nat_detect"  : 16,
        "appchat"     : 17,
        "health"      : 18,
        "spiritapp"   : 19,
        "friendserver": 20,

        /* specially for webserver */
        "webserver"   : 101,
        "general"     : 102,
        "operfile"    : 103
    }),
    "bIsValidService" : function (serName) {
        for (var name in cons.serviceIdx) {
        //    console.log(name);
            if (cons.serviceName.webserver == name) {
                console.error("Invalid service name: "+serName+"!");

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
}


