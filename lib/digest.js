var http   = require('http');
var crypto = require('crypto');

var g_digestUserName = "security_super";
var g_digestPassword = "lvzhou1-super";
var g_nc             = 0;

module.exports = digest;

function digest(options, body, res1, callback) {
  var req =  http.request(options, function (res) {
    handleResponse(options, body, res, res1, callback);
  });
  req.end(JSON.stringify(body));
  req.on('error', function(err) {
    console.error(new Date() + '[DIGEST] req on error. req.path = ' + req.path);
    console.error('[DIGEST] req.url: ' + req.url);
    console.error('[DIGEST] req.headers: ' + req.headers);
    console.error('[DIGEST] req.method: ' + req.method);
    console.error('[DIGEST] err.stack: ' + err.stack);
    console.error('[DIGEST] err.code: ' + err.code);
  });
  /*
  req.setTimeout(30000, function () {
    console.error('v2 time out');
    if (res1 && (!res1.finished)) {
      res1.writeHead(404);
      res1.write('v2 time out');
      res1.end();
    }
  });*/
}

function handleResponse(options, body, res, res1, callback) {
  if (res.statusCode == 200) {
    callback(res);
    return;
  }
  if (res.headers['www-authenticate'] == undefined) {
    console.error('v2 www-authenticate undefined');
    if (res1 && (!res1.finished)) {
      res1.writeHead(404);
      res1.write('v2 www-authenticate undefined');
      res1.end();
    }
    return;
  }
  var challenge = parseChallenge(res.headers['www-authenticate']);
  var ha1 = crypto.createHash('md5');
  ha1.update([g_digestUserName, challenge.realm, g_digestPassword].join(':'));
  var ha2 = crypto.createHash('md5');
  ha2.update([options.method, options.path].join(':'));

  // Generate cnonce
  var cnonce = false;
  var nc = false;
  if (typeof challenge.qop === 'string') {
    var cnonceHash = crypto.createHash('md5');
    cnonceHash.update(Math.random().toString(36));
    cnonce = cnonceHash.digest('hex').substr(0, 8);
    nc = updateNC();
  }

  // Generate response hash
  var response = crypto.createHash('md5');
  var responseParams = [
    ha1.digest('hex'),
    challenge.nonce
  ];

  if (cnonce) {
    responseParams.push(nc);
    responseParams.push(cnonce);
  }

  responseParams.push(challenge.qop);
  responseParams.push(ha2.digest('hex'));
  response.update(responseParams.join(':'));

  // Setup response parameters
  var authParams = {
    username: g_digestUserName,
    realm: challenge.realm,
    nonce: challenge.nonce,
    uri: options.path,
    qop: challenge.qop,
    response: response.digest('hex'),
    opaque: challenge.opaque
  };
  if (cnonce) {
    authParams.nc = nc;
    authParams.cnonce = cnonce;
  }

  var headers = options.headers || {};
  headers.Authorization = compileParams(authParams);
  options.headers = headers;
  var req = http.request(options, function (res) {
    callback(res);
  });
  req.end(JSON.stringify(body));
  req.on('error', function(err) {
    console.error(new Date() + '[DIGEST] req on error. req.path = ' + req.path);
    console.error('[DIGEST] req.url: ' + req.url);
    console.error('[DIGEST] req.headers: ' + req.headers);
    console.error('[DIGEST] req.method: ' + req.method);
    console.error('[DIGEST] err.stack: ' + err.stack);
    console.error('[DIGEST] err.code: ' + err.code);
  });
  /*
  req.setTimeout(30000, function () {
    console.error('v2 time out');
    if (res1 && (!res1.finished)) {
      res1.writeHead(404);
      res1.write('v2 time out');
      res1.end();
    }
  });*/
}

function parseChallenge(digest) {
  var prefix = "Digest ";
  var challenge = digest.substr(digest.indexOf(prefix) + prefix.length);
  var parts = challenge.split(',');
  var length = parts.length;
  var params = {};
  for (var i = 0; i < length; i++) {
    var part = parts[i].match(/^\s*?([a-zA-Z0-0]+)="(.*)"\s*?$/);
    if (part.length > 2) {
      params[part[1]] = part[2];
    }
  }

  return params;
}

function compileParams(params) {
  var parts = [];
  for (var i in params) {
    parts.push(i + '="' + params[i] + '"');
  }
  return 'Digest ' + parts.join(',');
}

function updateNC() {
  var max = 99999999;
  g_nc++;
  if (g_nc > max) {
    g_nc = 1;
  }
  var padding = new Array(8).join('0') + "";
  var nc = g_nc + "";
  return padding.substr(0, 8 - nc.length) + nc;
}