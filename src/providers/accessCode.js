/*eslint no-useless-escape: "off"*/
const jwt = require("jsonwebtoken");
const { getPublicKey, getConfig } = require("../config");
const { getAuthValid } = require("./accessCode/accessCodeApi");

const { RESTRICTED_RULES } = require("./rules");
const { getTokenFromHeader } = require("./getTokenFromHeader");
const { LOGGER } = require("../LOGGER");

/**
 * Sees if the incoming uri is also whitelisted in the token
 *
 * @param {string[]} urls list of allowed urls in the token
 * @param {string} toCheckUri the uri that is to be checked
 */
const isPageAllowed = (urls, toCheckUri) => {
    LOGGER.debug("Is %s an allowed Page url?", toCheckUri);
    return urls.some(
        (v) => v === toCheckUri.replace(".json", "").replace("slug-for-landing-page-generated-at-build-time", ""),
    );
};
/**
 * Removes trailing and leading slashes
 *
 * @param {string} path the path to stript the slashes from
 */
function stripSlashes(path) {
    let result = path.endsWith("/") ? path.slice(0, -1) : path;
    result = result.startsWith("/") ? result.slice(1) : result;
    return result;
}

/**
 * Memorized function that handles the creation of cached regexps
 *
 * @param {string} input the target path for which to obtain a regexp
 */
const createRegexps = (() => {
    const mem = {};

    return (input) => {
        if (mem[input]) return mem[input];
        let cleanInput = stripSlashes(input);

        const regex = [`^${cleanInput}\.json$`, `^${cleanInput}/.*\.json$`].map((v) => new RegExp(v));
        mem[input] = regex;

        return regex;
    };
})();

/**
 * Sees if the toCheckUri matches any of the whitelisted services
 *
 * @param {string[]} services services whitelisted in the cookie
 * @param {string} toCheckUri the uri to be checked
 */
const isServiceAllowed = (services, toCheckUri) => {
    LOGGER.debug("Is %s an allowed service url?", toCheckUri);

    return services.some((service) => {
        return createRegexps(service).some((v) => v.test(toCheckUri));
    });
};

/**
 * Removes all unwanted data from the incoming uri
 *
 * @param {{ uri: string }} param0 cleans irrelevant data from a token
 */
const getComparableUri = ({ uri }) => {
    const uriParts = uri.split("/");

    if (uriParts.length <= 2) {
        throw new Error("Invalid uri parts" + uriParts);
    }

    if (uriParts[0] === "") {
        uriParts.shift();
    }

    let [, locale, ...relevantParts] = uriParts;

    let toCheckUri = relevantParts.join("/");

    if (!toCheckUri.endsWith(".json")) {
        throw new Error("Unsupported extension format should be .json");
    }
    return {
        uri: toCheckUri,
        locale,
    };
};

/**
 * Validates values from a token to see if it can access the current environment
 *
 * @param {string} level should always be 1 to avoid accidental API calls
 * @param {string} stackId should match stack and is coming from the token
 * @param {string} env the environment set in the token that should match the environment in the config
 * @param {string} provider the provider that should match the allowed provider
 */
const validateTokenValues = (stackId, env, provider) => {
    const { region, environment } = getConfig();

    if (provider !== "PROVIDED_ACCESS_CODE") {
        LOGGER.error("Provider is not a trusted provider", provider);
        throw new Error("Invalid provider is used");
    }

    if (region !== stackId || environment !== env) {
        throw new Error("Invalid region");
    }
};

const getHeaderOrUndefined = (headers, key) => {
    const h = Object.keys(headers).find((v) => v.toLowerCase() === key.toLowerCase());
    return !h ? undefined : headers[h][0].value;
};

/**
 * Validates the JWT token based on the RS256 algorithm and the public key
 *
 * @param {string} token the JWT token as a utf-8 string
 */
const verifyToken = async (token, host) => {
    if (!token) throw new Error("No jwt token provided");

    const publicKey = await getPublicKey(host);

    // Remove any spaces
    const trimmedToken = token.trim();
    return jwt.verify(trimmedToken, publicKey.toString(), { algorithms: ["RS256"] });
};

/**
 * Verifies if an accessCode should be allowed to access the requested content
 *
 * @param {{ headers: any, uri: string }} request CloudFront request object
 */
const verifyAccessCode = async (request) => {
    const config = getConfig();
    const accessCode = getTokenFromHeader(request, config.environment, "accessCode");

    // Currently, it's not meant to be possible for a patient to have both an
    // accessCode and an authToken, but since this is optional, I've left it in
    // as I suspect this requirement will be needed at a future point.
    let authToken;
    try {
        authToken = getTokenFromHeader(request, config.environment, "accessToken");
    } catch (ex) {
        // It's optional so no error thrown
    }
    const source = getHeaderOrUndefined(request.headers, "X-Source");
    const host = source || getHeaderOrUndefined(request.headers, "Host");

    if (!host) {
        throw new Error("Invalid host");
    }

    const { stackId, env, provider } = await verifyToken(accessCode, host);

    validateTokenValues(stackId, env, provider);

    const { uri: toCheckUri } = getComparableUri(request);
    const { results } = await getAuthValid(host, accessCode, authToken);

    const isAllowed = results.some((v) => {
        const { urls, services, loginType } = v;

        if (loginType !== "accessCode") {
            return false;
        }

        return isPageAllowed(urls, toCheckUri) || isServiceAllowed(services, toCheckUri);
    });

    if (isAllowed) {
        return request;
    }

    throw new Error("User is not allowed to visit this page with this access code");
};

/**
 * If the uri contains restricted level verify if the accesstoken grants access
 *
 * @param {*} request the cloudfront request
 */
const validateAccessCodeRequest = async (request) => {
    const { uri } = request;
    if (uri && RESTRICTED_RULES.some((v) => v.test(uri))) {
        return await verifyAccessCode(request);
    }
    LOGGER.debug("access code is not required for this request");
};

module.exports = {
    verifyAccessCode,
    validateAccessCodeRequest,
};
