var httpProxy = require("http-proxy");
var http = require("http");
var fs = require("fs");
var cors = require("cors");
require("dotenv").config();

var port = process.env.PORT ?? 8080;
var qdrantPort = 3001;

var proxy = httpProxy.createProxyServer({
  target: {
    protocol: "https:",
    host: "api.deepgram.com",
    port: 443,
    pfx: fs.readFileSync("certificate.p12"),
  },
  changeOrigin: true,
});

var qdrantProxy = httpProxy.createProxyServer({
  target: {
    protocol: "https:",
    host: "1cb1d5ed-6fbe-4bc8-8046-c97fe7278208.us-east-1-0.aws.cloud.qdrant.io",
    port: 6333,
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

qdrantProxy.on("error", function (err, req, res) {
  sendError(res, err);
});

var corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  optionsSuccessStatus: 200,
};

proxy.on("proxyRes", (proxyRes, req, res) => {
  cors(corsOptions)(req, res, () => { });
});

qdrantProxy.on("proxyRes", (proxyRes, req, res) => {
  cors(corsOptions)(req, res, () => { });
});

var server = http.createServer(function (req, res) {
  proxy.web(req, res, { target: "https://api.deepgram.com" });
});

var qdrantServer = http.createServer(function (req, res) {
  qdrantProxy.web(req, res, { target: "https://1cb1d5ed-6fbe-4bc8-8046-c97fe7278208.us-east-1-0.aws.cloud.qdrant.io:6333" });
});

server.on("upgrade", function (req, socket, head) {
  proxy.ws(req, socket, head);
});

qdrantServer.on("upgrade", function (req, socket, head) {
  qdrantProxy.ws(req, socket, head);
});

console.log(`listening on port ${port}`);
server.listen(port);

console.log(`Qdrant proxy listening on port ${qdrantPort}`);
qdrantServer.listen(qdrantPort);