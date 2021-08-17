const jwt = require("jsonwebtoken");
const { getPublicKey, getConfig } = require("../config");
const { validateAccessCodeRequest } = require("./accessCode");
const { RESTRICTED_RULES } = require("./rules");
const { getTokenFromHeader } = require("./getTokenFromHeader");

const { LOGGER } = require("../LOGGER");

/**
 * Validates the JWT token based on the RS256 algorithm and the public key
 *
 * @param {*} token the JWT token as a utf-8 string
 * @param {*} host the API host from which the JWT token was retrieved
 */
const verifyToken = async (token, host) => {
    if (!token) throw new Error("No jwt token provided");
    const publicKey = await getPublicKey(host);

    // Remove any spaces
    const trimmedToken = token.trim();
    return jwt.verify(trimmedToken, publicKey.toString(), { algorithms: ["RS256"] });
};

const getHeaderOrUndefined = (headers, key) => {
    const h = Object.keys(headers).find((v) => v.toLowerCase() === key.toLowerCase());
    return !h ? undefined : headers[h][0].value;
};

const verifyJanRain = async (request, cookieName = "accessToken") => {
    const config = getConfig();
    const accessTokenCookie = getTokenFromHeader(request, config.environment, cookieName);
    const source = getHeaderOrUndefined(request.headers, "X-Source");
    const host = source || getHeaderOrUndefined(request.headers, "Host");

    if (!host) {
        throw new Error("Invalid host");
    }

    const { provider } = await verifyToken(accessTokenCookie, host);
    if (provider !== "JANRAIN_PATIENT" && provider !== "PROVIDED_ACCESS_CODE") {
        throw new Error("Invalid provider");
    }
    request.headers.cookie = [];

    // Access to gated content allowed. Proceed to CF
    return request;
};

const verifyRestricted = async (request) => {
    return await verifyJanRain(request);
};

const verifyRestrictedAccessCode = async (request) => {
    return await verifyJanRain(request, "accessCode");
};

/**
 * If the uri contains a mention to restricted verify it against janrain
 *
 * @param {*} request the cloudfront request
 */
const validateRestrictedContent = async (request) => {
    const { uri } = request;
    if (uri && RESTRICTED_RULES.some((v) => v.test(uri))) {
        LOGGER.debug("Is a restricted uri");
        return await verifyRestricted(request);
    }
};

/**
 * If the uri contains a mention to restricted, but wasn't able to
 * verify against janrain as a normal, "level-3" restricted page, then
 * try to verify as an access code "level-2" restricted page.
 *
 * @param {*} request the cloudfront request
 */
const validateAccessCodeContent = async (request) => {
    const { uri } = request;
    if (uri && RESTRICTED_RULES.some((v) => v.test(uri))) {
        LOGGER.debug("Is a restricted uri (possible access code scenario)");
        return await verifyRestrictedAccessCode(request);
    }
};

/**
 * Provider for janrain patient authenticated tokens
 * @Provider JANRAIN_PATIENT
 *
 * @param {*} request the AWS Cloudfront request
 */
const provider = async (request) => {
    LOGGER.debug("Starting normal prod behaviour");
    try {
        LOGGER.debug("Validating restricted access level");
        const restricted = await validateRestrictedContent(request);
        if (restricted) return restricted;
    } catch (ex) {
        // do access code stuff
        LOGGER.debug("Validating access code");
        const validAccessCode = await validateAccessCodeRequest(request);
        if (!validAccessCode) {
            throw ex;
        }

        const accessCode = await validateAccessCodeContent(request);

        if (!accessCode) {
            throw ex;
        }
    }
};

module.exports = {
    janrainPatientProvider: provider,
};
