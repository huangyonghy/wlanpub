/**
 * Created by Juneja on 2015/10/13.
 *
 * common data
 */

var uuid    = require('uuid');

// 用来存储前端Request ID与callback函数的映射关系
var callbackMap = new Map();

module.exports = comm = {
    'setCbMap' : function (callback) {
        var reqID  = uuid.v1();

        callbackMap.set(reqID, callback);

        return reqID;
    },
    'getCbObj' : function (reqID) {
        var cbObj = callbackMap.get(reqID);
        if (!cbObj) {
            // Important: imply that has no callback
            console.error('Invalid callback object mapped request ID: ' + reqID);
        } else {
            callbackMap.delete(reqID);
            return cbObj;
        }
    }
}
