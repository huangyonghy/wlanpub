var url           = require('url'),
    http          = require('http'),
    https         = require('https'),
    parseXML      = require('xml2js').parseString,
    XMLprocessors = require('xml2js/lib/processors');

/**
 * The CAS authentication types.
 * @enum {number}
 */
var AUTH_TYPE = {
    BOUNCE          : 0,
    BOUNCE_REDIRECT : 1,
    BLOCK           : 2
};

/**
 * ...
 * @typedef {Object} CAS_options
 * @property {string}  cas_url
 * @property {string}  service_url
 * @property {('1.0'|'2.0'|'3.0')} [cas_version='3.0']
 * @property {boolean} [renew=false]
 * @property {boolean} [is_dev_mode=false]
 * @property {string}  [dev_mode_user='']
 * @property {string}  [session_name='cas_user']
 * @property {boolean} [destroy_session=false]
 */

/**
 * ...
 * @param {CAS_options} options
 * @constructor
 */
function CASAuthentication( options ) {

    if( !options || typeof options !== 'object' ) {
        throw new Error( 'CAS Authentication was not given a valid configuration object.' );
    }
    if( options.cas_url === undefined ) {
        throw new Error( 'CAS Authentication requires a cas_url parameter.' );
    }
    if( options.service_url === undefined ) {
        throw new Error( 'CAS Authentication requires a service_url parameter.' );
    }

    this.cas_version = options.cas_version !== undefined ? options.cas_version : '3.0';

    if( this.cas_version === '1.0' ) {
        this._validateUri = '/validate';
        this._validate = function ( body, callback ) {
            var lines = body.split('\n');
            if( lines[ 0 ] === 'yes' && lines.length >= 2 ) {
                console.log( 'Successful CAS authentication.', lines[ 1 ] );
                return callback( null, lines[ 1 ] );
            }
            else if( lines[ 0 ] === 'no' ) {
                return callback( new Error( 'CAS authentication failed.' ) );
            }
            else {
                return callback( new Error( 'Response from CAS server was bad.' ) );
            }
        }
    }
    else if( this.cas_version === '2.0' || this.cas_version === '3.0' ) {
        //this._validateUri = ( this.cas_version === '2.0' ? '/serviceValidate' : '/p3/serviceValidate' );
        this._validateUri = '/serviceValidate';
        this._validate = function ( body, callback ) {
            parseXML( body, {
                trim: true,
                normalize: true,
                explicitArray: false,
                tagNameProcessors: [ XMLprocessors.normalize, XMLprocessors.stripPrefix ]
            }, function ( err, result ) {
                if( err ) {
                    return callback( new Error( 'Response from CAS server was bad.' ) );
                }
                try {
                    var failure = result.serviceresponse.authenticationfailure;
                    if( failure ) {
                        return callback( new Error( 'CAS authentication failed (' + failure.$.code + ').' ) );
                    }
                    var success = result.serviceresponse.authenticationsuccess;
                    if( success ) {
                        //return callback( null, success.user );
                        return callback( null, success );
                    }
                    else {
                        return callback( new Error( 'CAS authentication failed.' ) );
                    }
                }
                catch ( err ) {
                    console.log( err );
                    return callback( new Error( 'CAS authentication failed.' ) );
                }
            });
        }
    }
    else {
        throw new Error( 'The supplied CAS version ("' + this.cas_version + '") is not supported.' );
    }

    this.cas_url         = options.cas_url;
    var parsed_cas_url   = url.parse( this.cas_url );
    this.request_client  = ( parsed_cas_url.protocol === 'http:' ? http : https );
    this.cas_protocol    = ( parsed_cas_url.protocol === 'http:' ? 0 : 1 );
    this.cas_host        = parsed_cas_url.hostname;
    this.cas_port        = parsed_cas_url.port;
    this.cas_path        = parsed_cas_url.pathname;

    this.service_url     = options.service_url;

    this.renew           = options.renew !== undefined ? !!options.renew : false;

    this.is_dev_mode     = options.is_dev_mode !== undefined ? !!options.is_dev_mode : false;
    this.dev_mode_user   = options.dev_mode_user !== undefined ? options.dev_mode_user : '';

    this.session_name    = options.session_name !== undefined ? options.session_name : 'cas_user';
    this.destroy_session = options.destroy_session !== undefined ? !!options.destroy_session : false;
    this.touch_ttl       = options.touch_ttl;

    // Bind the prototype routing methods to this instance of CASAuthentication.
    this.bounce = this.bounce.bind( this );
    this.bounce_redirect = this.bounce_redirect.bind( this );
    this.block = this.block.bind( this );
    this.logout = this.logout.bind( this );
}

/**
 * Bounces a request with CAS authentication. If the user's session is not
 * already validated with CAS, their request will be redirected to the CAS
 * login page.
 */
CASAuthentication.prototype.bounce = function ( req, res, next ) {

    // Handle the request with the bounce authorization type.
    var pathname = url.parse( req.url ).pathname;
    if (pathname == '/v3/web/login' || pathname == '/v3/web/login.html'||(0==pathname.indexOf("/v3/web/static"))) {
        console.log('bounce... next....');
        next();
    }else {
        this._handle( req, res, next, AUTH_TYPE.BOUNCE );
    }
};

/**
 * Bounces a request with CAS authentication. If the user's session is not
 * already validated with CAS, their request will be redirected to the CAS
 * login page.
 */
CASAuthentication.prototype.bounce_redirect = function ( req, res, next ) {

    // Handle the request with the bounce authorization type.
    this._handle( req, res, next, AUTH_TYPE.BOUNCE_REDIRECT );
};

/**
 * Blocks a request with CAS authentication. If the user's session is not
 * already validated with CAS, they will receive a 401 response.
 */
CASAuthentication.prototype.block = function ( req, res, next ) {

    // Handle the request with the block authorization type.
    this._handle( req, res, next, AUTH_TYPE.BLOCK );
};

/**
 * Handle a request with CAS authentication.
 */
CASAuthentication.prototype._handle = function ( req, res, next, authType ) {

    // If the session has been validated with CAS, no action is required.
    if( req.session[ this.session_name ] ) {
        // If this is a bounce redirect, redirect the authenticated user.
        if( authType === AUTH_TYPE.BOUNCE_REDIRECT ) {
            res.redirect( req.session.cas_return_to );
        }
        // Otherwise, allow them through to their request.
        else {
            next();
        }
    }
    // If dev mode is active, set the CAS user to the specified dev user.
    else if( this.is_dev_mode ) {
        req.session[ this.session_name ] = this.dev_mode_user;
        next();
    }
    // If the authentication type is BLOCK, simply send a 401 response.
    else if( authType === AUTH_TYPE.BLOCK ) {
        res.sendStatus( 401 );
    }
    // If there is a CAS ticket in the query string, validate it with the CAS server.
    else if( req.query && req.query.ticket ) {
        this._handleTicket( req, res, next );
    }
    // Otherwise, redirect the user to the CAS login.
    else {
        this._login( req, res, next );
    }
};

/**
 * Redirects the client to the CAS login.
 */
CASAuthentication.prototype._login = function ( req, res, next ) {

    // Save the return URL in the session. If an explicit return URL is set as a
    // query parameter, use that. Otherwise, just use the URL from the request.
    req.session.cas_return_to = req.query.returnTo || url.parse( req.url ).path;

    // Set up the query parameters.
    var pathname = url.parse( req.url ).pathname;
    var queryUrl;
    if (pathname == '/v3/base/userauth') {
        queryUrl = 'http://h3crd-wlan1.chinacloudapp.cn';
    }else {
        queryUrl = this.service_url;
    }
    var query = {
        service : queryUrl + pathname
    };
    if( this.renew ) { query.renew = this.renew; }

    // Redirect to the CAS login.
    console.log('cas_url: ' + this.cas_url);
    console.log('service_url: ' + this.service_url);
    console.log('req.url: ' + JSON.stringify(url.parse(req.url)));
    console.log('pathname: ' + url.parse( req.url ).pathname);
    var redirectUrl;
    if (pathname == '/v3/base/userauth' || pathname == '/v3/app/login') {
        console.log('redirect app...');
        redirectUrl = this.cas_url + url.format({
                pathname : '/v1/tickets'
        });
        var resMsg = {"cas_url" : redirectUrl, "cas_protocol" : this.cas_protocol};
        if (pathname == '/v3/base/userauth') {
            res.removeHeader('Transfer-Encoding');
        }
        res.end(JSON.stringify(resMsg));
    }else {
        console.log('redirect browser...');
        query = {service : this.service_url + '/v3/web', loginUrl : this.service_url + '/v3/web/login.html'};
        redirectUrl = this.cas_url + url.format({
                pathname : '/login',
                query    : query
        });
        res.redirect(redirectUrl);
    }
};

/**
 * Logout the currently logged in CAS user.
 */
CASAuthentication.prototype.logout = function ( req, res, next ) {
    var pathname = url.parse( req.url ).pathname;

    // Destroy the entire session if the option is set.
    if( this.destroy_session ) {
        req.session.destroy( function ( err ) {
            if( err ) { console.log( err ); }
        });
    }
    // Otherwise, just destroy the CAS session variable.
    else {
        delete req.session[ this.session_name ];
    }

    // Redirect the client to the CAS logout.
    if (pathname == '/v3/app/logout') {
        var resMsg = {"cas_url_logout" : this.cas_url+'/logout'};
        res.end(JSON.stringify(resMsg));
    } else {
        var query = {
            service : this.service_url + '/v3'
        };
        var redirectUrl = this.cas_url + url.format({
                pathname: "/logout",
                query    : query
            });
        res.redirect( redirectUrl );
    }
};

/**
 * Handles the ticket generated by the CAS login requester and validates it with the CAS login acceptor.
 */
CASAuthentication.prototype._handleTicket = function ( req, res, next ) {

    var queryUrl;
    if (url.parse( req.url ).pathname == '/v3/base/userauth') {
        queryUrl = 'http://h3crd-wlan1.chinacloudapp.cn';
    }else {
        queryUrl = this.service_url;
    }
    var request = this.request_client.get({
        host: this.cas_host,
        port: this.cas_port,
        path: url.format({
            pathname: this.cas_path + this._validateUri,
            query: {
                service : queryUrl + url.parse( req.url ).pathname,
                ticket  : req.query.ticket
            }
        }),
        method: 'GET'
    }, function ( response ) {
        response.setEncoding( 'utf8' );
        var body = '';
        response.on( 'data', function ( chunk ) {
            return body += chunk;
        }.bind( this ));
        response.on( 'end', function () {
            this._validate( body, function ( err, user ) {
                if( err ) {
                    console.log( err );
                    res.sendStatus( 401 );
                }
                else {
                    req.session[ this.session_name ] = user;
                    //console.log(req.sessionStore.ttl);
                    /* µÇÂ¼³É¹¦ºó£¬½«´æ´¢ÔÚredisÖÐµÄsessionÉèÖÃ¹ýÆÚÊ±¼äÎª2592000¼´30Ìì,²¢ÇÒÖÐ¼ä²»½øÐÐÊ±¼äµÄË¢ÐÂÖØÖÃ */
                    if(this.touch_ttl !== undefined)
                    {
                        req.sessionStore.ttl = this.touch_ttl;
                        req.sessionStore.touch(req.session.id, req.session, function(err) {
                            if (!err) {
                                console.log('touch session ttl success. key/value = %s/%s.',
                                    req.session.id, req.sessionStore.ttl);
                            }else {
                                console.error('touch session ttl failed with error: ' + err);
                            }
                        });
                    }
                    var pathname = url.parse( req.url ).pathname;
                    console.log('_handleTicket pathname: ' + pathname);
                    if (pathname == '/v3/base/userauth' || pathname == '/v3/app/login') {
                        var resMsg = {"sessionid" : req.sessionID};
                        if (pathname == '/v3/base/userauth') {
                            res.removeHeader('Transfer-Encoding');
                        }
                        res.end(JSON.stringify(resMsg));
                    }else {
                        res.redirect( req.session.cas_return_to );
                    }
                }
            }.bind( this ));
        }.bind( this ));
        response.on( 'error', function ( err ) {
            console.log( 'Response error from CAS: ', err );
            res.sendStatus( 401 );
        }.bind( this ));
    }.bind( this ));

    request.on( 'error', function ( err ) {
        console.log( 'Request error with CAS: ', err );
        res.sendStatus( 401 );
    }.bind( this ));

    request.end();
};

module.exports = CASAuthentication;