/**
 * Created by Juneja on 2015/10/13.
 *
 * common data
 */

var uuid    = require('uuid');

// 用来存储前端Request ID与Response对象的映射关系, Request ID map Response OBJ
var req2ResMap = new Map();

module.exports = comm = {
    'setResMap'  : function (response) {
        var reqID  = uuid.v1();

        req2ResMap.set(reqID, response);

        return reqID;
    },
    'getResObj'  : function (reqID) {
        var resObj = req2ResMap.get(reqID);
        if (!resObj) {
            // Important: imply that had responsed
            console.error('Invalid response object mapped request ID: ' + reqID);
        } else {
            req2ResMap.delete(reqID);
            return resObj;
        }
    }
}
