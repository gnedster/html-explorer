//Handle circular references (i.e. twitter)
//Figure out how to highlight
//Figure out fixed width situation
//Sort table on right

var connect = require("connect");
var serveStatic = require("serve-static");
var bodyParser = require("body-parser");
var compression = require("compression");
var htmlparser = require("htmlparser2");
var html = require("html");
var http = require("follow-redirects").http;
var https = require("follow-redirects").https;
var url = require("url");

var port = process.env.PORT || 8080;
var app = connect();


//Singleton
var stats = {};

var parser = (function() {
    function accumulate(name, attribs){
        stats[name] = stats[name] || 0;
        stats[name] += 1;
    }

    var o = new htmlparser.Parser({
        onopentag: accumulate,
        onclosetag: accumulate
    }, {decodeEntities: true});

    return o;
})();

app.use(compression());
app.use(serveStatic(__dirname)).listen(port);
app.use(bodyParser.urlencoded());

app.use(function(req, res){
    if (req.originalUrl !== "/url") {
        return;
    }
    var chunks = [];
    var parsedUrl = url.parse(req.body.url);

    function responseHandler(resp) {
        resp.setEncoding("utf8");
        resp.on("data", function(chunk){
            chunks.push(chunk);
        });

        resp.on("end", function(){
            var result = {
                html: html.prettyPrint(chunks.join(""), {indent_size: 2})
            }

            parser.write(result["html"]);

            result["stats"] = stats;

            res.end(JSON.stringify(result));
                stats = {};
        });
    }

    function errorHandler(e) {
        console.warn("Got error: " + e.message);
        res.end(JSON.stringify(e));
    }

    switch(parsedUrl.protocol) {
        case "https:":
            https.request({
                    hostname: parsedUrl.host,
                    port: 443,
                    path: parsedUrl.path,
                    method: 'GET'
                }, responseHandler)
                .on('error', errorHandler)
                .end();
            break;
        case "http:":
            http.get(req.body.url, responseHandler)
                .on("error", errorHandler);
            break;
        default:
            console.warn("Unsupported URL: " + req.body.url);
            res.end("Unsupported url");
    }
})

console.log("Server is now running on port " + port + "...");

