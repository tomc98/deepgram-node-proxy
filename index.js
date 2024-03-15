var httpProxy = require("http-proxy");
var http = require("http");
var fs = require("fs");
var cors = require("cors");
require("dotenv").config();

var port = process.env.PORT ?? 8080;

var proxy = httpProxy.createProxyServer({
  target: {
    protocol: "https:",
    host: "api.deepgram.com",
    port: 443,
    pfx: fs.readFileSync("certificate.p12"),
  },
  changeOrigin: true,
});

proxy.on("proxyReq", function (proxyReq,) {
  if (
    proxyReq.getHeader("authorization") &&
    proxyReq.getHeader("authorization").toLowerCase() === "token proxy"
  ) {
    proxyReq.setHeader(
      "authorization",
      `token ${process.env.DEEPGRAM_API_KEY}`
    );
  }
});

var sendError = function (res, err) {
  return res.status(500).send({
    error: err,
    message: "An error occured in the proxy",
  });
};

proxy.on("error", function (err, req, res) {
  sendError(res, err);
});

var corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  optionsSuccessStatus: 200,
};

proxy.on("proxyRes", (proxyRes, req, res) => {
  cors(corsOptions)(req, res, () => { });
});

var server = http.createServer(function (req, res) {
  proxy.web(req, res, { target: "https://api.deepgram.com" });
});

server.on("upgrade", function (req, socket, head) {
  proxy.ws(req, socket, head);
});

console.log(`listening on port ${port}`);
server.listen(port);