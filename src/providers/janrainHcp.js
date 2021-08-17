const jwt = require("jsonwebtoken");
const { getPublicKey, getConfig } = require("../config");
const { validateMarketingRequest } = require("./marketingToken");
const { LEVEL_3_RULES, LEVEL_2_RULES } = require("./rules");
const { getTokenFromHeader } = require("./getTokenFromHeader");
const reverseDNSLookup = require("./reverse-dns-lookup");

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

const verifyJanRain = async (request, minimalLevel = 3) => {
    const config = getConfig();
    const accessTokenCookie = getTokenFromHeader(request, config.environment, "accessToken");
    const source = getHeaderOrUndefined(request.headers, "X-Source");
    const host = source || getHeaderOrUndefined(request.headers, "Host");

    if (!host) {
        throw new Error("Invalid host");
    }

    const { level, provider } = await verifyToken(accessTokenCookie, host);
    if (provider && provider !== "JANRAIN_HCP" && provider !== "PROVIDED_ANONYMOUS") {
        LOGGER.error("Provider is not a trusted provider", provider);
        throw new Error("Invalid provider is used");
    }
    if (!level) {
        LOGGER.error("Level not set, token not trusted");
        throw new Error("Invalid request no level set");
    }
    if (level < minimalLevel) {
        LOGGER.error("User level isn't valid for the requested path", level, minimalLevel);
        throw new Error("Invalid request wrong level");
    }

    request.headers.cookie = [];

    // Access to gated content allowed. Proceed to CF
    return request;
};

const verifyLevel2 = async (request) => {
    const config = getConfig();
    // Googlebot can index all level-2 pages without auth
    if (config.googlebot.allowLevel2 && (await verifyGoogleBot(request))) {
        return request;
    }
    return await verifyJanRain(request, 2);
};

const verifyLevel3 = async (request) => {
    return await verifyJanRain(request, 3);
};

/**
 * If the uri contains a mention to level-3 verify it against janrain
 *
 * @param {*} request the cloudfront request
 */
const validateLevel3Content = async (request) => {
    const { uri } = request;
    if (uri && LEVEL_3_RULES.some((v) => v.test(uri))) {
        LOGGER.debug("Is a level-3 uri");
        return await verifyLevel3(request);
    }
};

/**
 * If the uri contains a mention to level-2 verify check the level
 *
 * @param {*} request the cloudfront request
 */
const validateLevel2Content = async (request) => {
    const { uri } = request;
    if (uri && LEVEL_2_RULES.some((v) => v.test(uri))) {
        LOGGER.debug("A level-2 uri");
        return await verifyLevel2(request);
    }
};

/**
 * Provider for janrain HCP authenticated tokens
 *
 * @Provider JANRAIN_PATIENT, PROVIDED_MARKETING, PROVIDED_ANONYMOUS
 *
 * @param {*} request the AWS Cloudfront Request
 */
const provider = async (request) => {
    LOGGER.debug("Starting normal prod behaviour");
    try {
        LOGGER.debug("Validating level 3");
        const level3 = await validateLevel3Content(request);
        if (level3) return level3;

        LOGGER.debug("Validating level 2");
        const level2 = await validateLevel2Content(request);
        if (level2) return level2;
    } catch (ex) {
        // do marketing stuff
        LOGGER.debug("Validating marketing token");
        const marketing = await validateMarketingRequest(request);

        if (!marketing) {
            throw ex;
        }
    }
};

/**
 * verify whether the request is coming from the Googlebot and let it pass
 *
 * @param {*} request the AWS Cloudfront Request
 */
const verifyGoogleBot = async (request) => {
    LOGGER.debug("GoogleBot? Is that you?");

    // quick user-agent check to avoid the costly reverse DNS lookup
    const userAgent = getHeaderOrUndefined(request.headers, "user-agent");
    let googlebot = /googlebot/i.test(userAgent);

    if (googlebot) {
        const ip = getHeaderOrUndefined(request.headers, "x-forwarded-for");
        googlebot = await reverseDNSLookup(ip, "google.com", "googlebot.com");
        LOGGER.debug(googlebot ? "Yes, my dear, it is I" : `FAKER! ${ip}`);
    }

    return googlebot;
};

module.exports = {
    verifyToken,
    verifyJanRain,
    verifyLevel2,
    verifyLevel3,
    janrainHcpProvider: provider,
    LEVEL_2_RULES,
    LEVEL_3_RULES,
};
