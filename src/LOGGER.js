const bunyan = require("bunyan");
const config = require("../lambda-config.json");

const LOGGER = bunyan.createLogger({
    name: "cf-url-rewrite-fn",
    level: config.logLevel || "debug",
});

exports.LOGGER = LOGGER;
