const MiddlewareRegistry = require('./MiddlewareRegistry');
const http = require('http');
const https = require('https');


function Server(sslOptions, logging = {"enabled": false}) {
    const middleware = new MiddlewareRegistry(logging);
    const server = _initServer(sslOptions);


    this.use = function use(url, callback) {
        let cb = callback;
        if (logging.enabled){
            cb = (req, res, options) => {
                if (req.starting_time){
                    let elapsed = Date.now() - req.starting_time;
                    console.log(`- Request handled in ${elapsed} milliseconds`)
                }
                callback(req, res, options);
            }
        }
        //TODO: find a better way
        if (arguments.length >= 2) {
            middleware.use(url, cb);
        } else if (arguments.length === 1) {
            callback = url;
            middleware.use(cb);
        }

    };


    this.get = function getReq(reqUrl, reqResolver) {
        middleware.use("GET", reqUrl, reqResolver);
    };

    this.post = function postReq(reqUrl, reqResolver) {
        middleware.use("POST", reqUrl, reqResolver);
    };

    this.put = function putReq(reqUrl, reqResolver) {
        middleware.use("PUT", reqUrl, reqResolver);
    };

    this.delete = function deleteReq(reqUrl, reqResolver) {
        middleware.use("DELETE", reqUrl, reqResolver);
    };

    this.options = function optionsReq(reqUrl, reqResolver) {
        middleware.use("OPTIONS", reqUrl, reqResolver);
    };
    this.makeLocalRequest = function (method,path, body,headers, callback)
    {
        if (typeof headers === "function")
        {
            callback = headers;
            headers = undefined;
        }

        if (typeof body === "function")
        {
            callback = body;
            headers = undefined;
            body = undefined;
        }

        const protocol =  require(this.protocol);
        const options = {
            hostname : 'localhost',
            port : server.address().port,
            path,
            method,
            headers
        };
        const req = protocol.request(options, response => {

            if (response.statusCode < 200 || response.statusCode >= 300) {

                return callback(new Error("Failed to execute command. StatusCode " + response.statusCode));
            }
            let data = [];
            response.on('data', chunk => {
                data.push(chunk);
            });

            response.on('end', () => {
                try {
                    const bodyContent = $$.Buffer.concat(data).toString();
                    console.log('resolve will be called. bodyContent received : ', bodyContent);
                    return callback(undefined,bodyContent);
                } catch (err) {
                    return callback(err);
                }
            });
        });

        req.on('error', err => {
            console.log("reject will be called. err :", err);
            return callback(err);
        });

        req.write(body);
        req.end();
    };

    /* INTERNAL METHODS */

    function _initServer(sslConfig) {
        let server;
        if (sslConfig) {
             server = https.createServer(sslConfig, middleware.go);
             server.protocol = "https";
        } else {
            server = http.createServer(middleware.go);
            server.protocol = "http";
        }

        return server;
    }

    return new Proxy(this, {
       get(target, prop, receiver) {
           if(typeof target[prop] !== "undefined") {
               return target[prop];
           }

           if(typeof server[prop] === "function") {
               return function(...args) {
                   server[prop](...args);
               }
           } else {
               return server[prop];
           }
       }
    });
}

module.exports = Server;
