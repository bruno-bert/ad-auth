const cookie = require("cookie");

const parseCookies = (cookieHeaders = []) => {
    const parsedCookies = cookieHeaders.join(";").split(";");

    const result = new Map();
    parsedCookies.forEach((v) => {
        const parseResult = cookie.parse(v);
        const [key] = Object.keys(parseResult);

        if (!key) return;
        const k = key.toLowerCase();

        if (!result.has(k)) {
            result.set(k, []);
        }

        result.get(k).push(parseResult[key]);
    });

    return Object.fromEntries(result);
};

const getEnvCookie = (cookies, name, env, strip = true) => {
    const cookieList = cookies[name.toLowerCase()];
    if (!cookieList) {
        return;
    }

    const cookie = cookieList.find((v) => v.startsWith(env + "---"));
    if (cookie && strip) {
        return cookie.replace(`${env}---`, "");
    }

    return cookie;
};

/**
 * Maps the environment to the right prefix
 *
 * @param {*} env maps the environment to the right cookie prefix
 */
const getTokenMapping = (env) => {
    const mapping = {
        live: "prod",
        review: "prod",
        "local-uat": "uat",
        preview: "uat",
    };

    const mapped = mapping[env];
    return mapped || env;
};

/**
 * Gets a token from the header safely
 *
 * @param {*} request the request from Cloudfront
 * @param {*} tokenKey the key of the header that contains the token
 */
const getTokenFromHeader = (request, env, tokenKey) => {
    const cookieHeaders = request.headers && request.headers.cookie;
    if (!cookieHeaders || cookieHeaders.length == 0) throw new Error("Invalid request invalid headers");

    const cookies = parseCookies(cookieHeaders.map((v) => v.value));
    const backupCookie = cookies[tokenKey.toLowerCase()] || [];
    const desiredCookie = getEnvCookie(cookies, tokenKey, getTokenMapping(env)) || backupCookie[0];

    if (!desiredCookie) throw new Error("Invalid request token not found in cookie");

    return desiredCookie;
};

module.exports = {
    getTokenFromHeader,
};
