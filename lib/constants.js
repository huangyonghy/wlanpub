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
        "portal"      : "portal",
        "maintenance" : "maintenance",
        "app"         : "app",   /* 小贝 */
        "base"        : "base",  /* 设备基本管理 */
        "auth"        : "auth",
        "report"      : "report",   /* 设备状态信息 */
        "cps"         : "cps",   /* 探针 */
        "lbs"         : "lbs",   /* 定位 */
        "tunnel"      : "tunnel",   /* VPN隧道 */
        "imgdownload" : "imgdownload",
        "comm"        : "comm",  /* 社区交互 */
        "appchat"     : "appchat",  /* 小贝聊聊 */

        /* specially for webserver */
        "webserver"   : "webserver",
        "general"     : "general",
        "operfile"    : "operfile"
    }),
    "serviceIdx" : Object.freeze({
        "portal"      : 0,
        "maintenance" : 1,
        "app"         : 2,
        "base"        : 3,
        "auth"        : 4,
        "report"      : 5,
        "cps"         : 6,
        "lbs"         : 7,
        "tunnel"      : 8,
        "imgdownload" : 9,
        "comm"        : 10,
        "appchat"     : 11,

        /* specially for webserver */
        "webserver"   : 41,
        "general"     : 42,
        "operfile"    : 43
    }),
    "bIsValidService" : function (serName) {
        for (var name in cons.serviceIdx) {
    //        console.log(name);
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


