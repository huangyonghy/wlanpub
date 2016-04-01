var isJSON = require('is-json');
var digest = require('./digest');
var dbhd   = require('./dboper');

var DEV_KEY = 'devuser:';

// �ú��������ж�ָ�����豸�Ƿ�󶨵�ָ�����û�
exports.isDevBind2User  = function(cookies, session, devSN, callback) {
    //�����rd�˻���¼,�ɲ鿴�����豸
    if (cookies && cookies.SSOAuth_Cookie){
        callback(null, true);
        return;
    }
    if (session && session.cas_user && session.cas_user.attributes && session.cas_user.attributes.name) {
        var tenantName = session.cas_user.attributes.name;
    }else {
        console.error('[DIGEST]session.cas_user.user is undefined');
        console.error('[DIGEST]session: ' + session);
        callback(null, false);
        return;
    }
    if (!devSN) {
        console.error('[DIGEST]devSN is undefined');
        callback(null, false);
        return;
    }

    // �ȵ�redis���ݿ��ѯ,�鲻�����߲���ȵĻ�,�ٷ���Ϣ��v2��ѯ
    if (dbhd.redisClient) {
        var redisKey = DEV_KEY + devSN;
        dbhd.redisClient.get(redisKey, function(err, reply) {
            if (!err && reply && reply == tenantName) {
                callback(null, true);
            }else {
                getBindRelationFromV2(tenantName, devSN, callback);
            }
        });
    }else {
        console.error('[DIGEST]get devuser from redis fail. dbhd.redisClient is null, please check it. ' +
                      'If you want to get a more fluent user experience, please ensure dbhd.redisClient is not null first.');
        getBindRelationFromV2(tenantName, devSN, callback);
    }
};

function getBindRelationFromV2(tenantName, devSN, callback) {
    var digestOption    = {"host" : "lvzhou.h3c.com", "port" : 80, headers : {"accept" : "application/json"}};
    digestOption.method = 'POST';
    digestOption.path   = '/o2oportal/getDevStatus';
    var body = {'tenant_name' : tenantName, 'dev_snlist':[devSN]};

    digest(digestOption, body, null, function(response) {
        var resData = '';
        response.on('data', function (chunk) {
            resData += chunk;
        });
        response.on('end', function () {
            var bBind = false;
            if (isJSON(resData)) {
                var jsonData = JSON.parse(resData);
                if (jsonData.dev_statuslist != '') {
                    bBind = true;
                }
            }
            callback(null, bBind);
            // ���󶨹�ϵ���µ�redis���ݿ�
            if (bBind == true) {
                if (dbhd.redisClient) {
                    var redisKey = DEV_KEY + devSN;
                    dbhd.redisClient.set(redisKey, tenantName, function(err, reply){
                        if (!err) {
                            // ����������redis���ݿ��е�ʧЧʱ��ΪһСʱ
                            dbhd.redisClient.expire(redisKey, 3600);
                        }else {
                            console.error('set devuser to redis failed with error: %s. key = %s.', err, redisKey);
                        }
                    });
                }else {
                    console.error('[DIGEST]set devuser to redis fail. dbhd.redisClient is null, please check it. ' +
                                  'If you want to get a more fluent user experience, please ensure dbhd.redisClient is not null first.');
                }
            }
        });
        response.on('error', function (err) {
            console.error('http-digest-client error: ', err);
            callback(err, false);
        });
    });
}