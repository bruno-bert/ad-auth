const { getTokenFromHeader } = require("./getTokenFromHeader");
const jwt = require("jsonwebtoken");
const { getConfig } = require("../config");

/**
 * Tries to get the provider from the cookie in an unsafe way (using JWT decode not verify)
 * This allows you to get the provider without validating the token which should be done by
 * the right provider afterwards.
 *
 * @param {*} request the AWS Cloudfront request
 * @param {*} cookieName the name of the cookie that you wish to try and get the provider from
 */
const getProvider = (request, cookieName) => {
    const result = getTokenValues(request, cookieName);

    if (result && result.provider) return result.provider;
};

/**
 * Tries to get the data from the cookie or returns undefind if it can't find the token or can't decode the token
 *
 * @param {*} request the AWS Cloudfront request
 * @param {*} cookieName the name of the cookie that you wish to try and get the provider from
 * @returns
 */
const getTokenValues = (request, cookieName) => {
    let token = undefined;
    const config = getConfig();

    try {
        token = getTokenFromHeader(request, config.environment, cookieName);
    } catch (ex) {
        return undefined;
    }

    try {
        const data = jwt.decode(token);
        return data;
    } catch (ex) {
        return undefined;
    }
};

module.exports = {
    getProvider,
    getTokenValues,
};
