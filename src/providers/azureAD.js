const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

const cookie = require("cookie");

const { getDiscoverDocument, getJwks, postAuthorization } = require("./azure/azureApi");
const { fetchAdConfig, fetchBypassSecret } = require("./azure/configHelper");

const { getConfig } = require("../config");

const { LOGGER } = require("../LOGGER");

let discoveryDocument;
let jwks;
let config;
let secret;

/**
 * Gets the subject of the decoded id_token
 *
 * @param {*} decoded the decoded data of the id_token returned by azure
 */
const getSubject = (decoded) => {
    return decoded.payload.upn || decoded.payload.sub;
};

const getRedirectUri = ({ headers }) => {
    return `https://${headers.host[0].value}${config.CALLBACK_PATH}`;
};

/**
 * Preloads any required config for Azure
 */
const preLoad = async () => {
    LOGGER.debug("Preloading Azure Information");
    if (jwks && discoveryDocument && config && secret) {
        return;
    }

    LOGGER.debug("Getting fresh info from Azure");

    const { prefix, standardizedEnv } = getConfig();

    config = await fetchAdConfig(prefix, standardizedEnv);
    secret = await fetchBypassSecret();

    discoveryDocument = await getDiscoverDocument(config.DISCOVERY_DOCUMENT);
    if (!discoveryDocument || !discoveryDocument.jwks_uri) {
        throw new Error("Internal server error: Unable to find JWK in discoverDocument");
    }

    jwks = await getJwks(discoveryDocument.jwks_uri);
};

/**
 * Creates a valid response for a correct authentication response
 *
 * @param {*} queryDict
 * @param {*} headers
 * @param {*} decodedData
 */
const createValidResponse = (queryDict, headers, decodedData) => {
    return {
        status: "302",
        statusDescription: "Found",
        body: "ID token retrieved.",
        headers: {
            location: [
                {
                    key: "Location",
                    value: queryDict.get("state") || "https://" + headers.host[0].value,
                },
            ],
            "set-cookie": [
                {
                    key: "Set-Cookie",
                    value: cookie.serialize(
                        "TOKEN",
                        jwt.sign(
                            {},
                            config.PRIVATE_KEY.trim(),
                            {
                                audience: headers.host[0].value,
                                subject: getSubject(decodedData),
                                expiresIn: config.SESSION_DURATION,
                                algorithm: "RS256",
                            }, // Options
                        ),
                        {
                            path: "/",
                            maxAge: config.SESSION_DURATION,
                            httpOnly: true,
                            secure: true,
                        },
                    ),
                },
            ],
        },
    };
};

/**
 * Redirect the user to the azure login page
 */
const redirect = (request) => {
    const queryParams = {
        ...config.AUTH_REQUEST,
        redirect_uri: getRedirectUri(request),
        state: request.uri,
    };

    const querystring = new URLSearchParams(queryParams).toString();

    return {
        status: "302",
        statusDescription: "Found",
        body: "Redirecting to OIDC provider",
        headers: {
            location: [
                {
                    key: "Location",
                    value: discoveryDocument.authorization_endpoint + "?" + querystring,
                },
            ],
            "set-cookie": [
                {
                    key: "Set-Cookie",
                    value: cookie.serialize("TOKEN", "", {
                        path: "/",
                        expires: new Date(1970, 1, 1, 0, 0, 0, 0),
                    }),
                },
            ],
        },
    };
};

/**
 * Handles the auth/callback
 *
 * @param {*} queryDict
 */
const handleAuthCallback = async (queryDict, headers, request) => {
    if (queryDict.has("error")) {
        throw new Error("AZURE Provider: remote failed with error " + queryDict.get("error"));
    }

    if (!queryDict.has("code")) {
        throw new Error("No code found in callback");
    }

    const postBody = {
        ...config.TOKEN_REQUEST,
        redirect_uri: getRedirectUri(request),
        code: queryDict.get("code"),
    };

    const postData = new URLSearchParams(postBody).toString();
    const authorizationResult = await postAuthorization(discoveryDocument.token_endpoint, postData);

    const decodedData = jwt.decode(authorizationResult.id_token, { complete: true });

    try {
        let pem = "";
        for (let i = 0; i < jwks.keys.length; i++) {
            if (decodedData.header.kid === jwks.keys[i].kid) {
                pem = jwkToPem(jwks.keys[i]);
                break;
            }
        }

        jwt.verify(authorizationResult.id_token, pem, { algorithms: ["RS256"] });

        return createValidResponse(queryDict, headers, decodedData);
    } catch (ex) {
        if (ex.name === "TokenExpiredError") {
            LOGGER.debug("Token expired, redirecting to OIDC provider.");
            return redirect(request);
        }
        throw ex;
    }
};

/**
 * Verify if the token send by the user is correct
 *
 * @param {*} headers
 */
const verifyIncomingToken = (headers, request) => {
    const { TOKEN } = cookie.parse(headers["cookie"][0].value);
    try {
        jwt.verify(TOKEN, config.PUBLIC_KEY.trim(), { algorithms: ["RS256"] });
    } catch (ex) {
        if (ex.name === "TokenExpiredError") {
            LOGGER.debug("Token expired, redirecting to OIDC provider.");
            return redirect(request);
        }
        throw ex;
    }
};

/**
 * Handles the authentication flow: redirect to login, auth callback, auth valid, auth failed
 *
 * @param {*} request the request from cloudfront
 */
const authFlow = async (request) => {
    const { headers, querystring } = request;
    const queryDict = new URLSearchParams(querystring);

    let result;
    let requiresAdditionalAction = false;

    if (request.uri.startsWith(config.CALLBACK_PATH)) {
        LOGGER.debug("Handling auth callback");
        result = await handleAuthCallback(queryDict, headers, request);
        requiresAdditionalAction = true;
    } else if ("cookie" in headers && "TOKEN" in cookie.parse(headers["cookie"][0].value)) {
        LOGGER.debug("Validationg token");
        const response = verifyIncomingToken(headers, request);
        if (!response) {
            LOGGER.debug("Token valid");
            result = request;
        } else {
            LOGGER.debug("Token expired");
            result = response;
            requiresAdditionalAction = true;
        }
    } else {
        LOGGER.debug("Redirecting the user to login");
        result = redirect(request);
        requiresAdditionalAction = true;
    }

    return { result, requiresAdditionalAction };
};

/**
 * Checks if the user has set a bypass secret for testing purposes
 *
 * @param {*} request the request from cloudfront
 */
const validateBypass = (request) => {
    const { headers } = request;
    if (!("cookie" in headers)) return;

    const parsedCookie = cookie.parse(headers["cookie"][0].value);
    if (!("testingToken" in parsedCookie)) return;
    LOGGER.info("Got a bypass for request", request);

    const { testingToken } = parsedCookie;
    if (testingToken !== secret) {
        LOGGER.info("Bypass failed, invalid secret");
        return;
    }

    return { result: request, requiresAdditionalAction: false };
};

/**
 * Blank, this page is a safe haven for QA
 */
const blank = ({ uri }) => {
    if (uri !== "/blank") return;

    return {
        status: "200",
        statusDescription: "OK",
        body: "Welcome to the QA safe haven! Enjoy your stay!",
    };
};

/**
 * Verify if user is logged in against the active directory for non prod environments
 * or used a bypass method.
 *
 * @param {*} request the request from cloudfront
 */
const verifyAD = async (request) => {
    await preLoad();

    // check if bypass secret is set for testing
    const bypass = validateBypass(request);
    if (bypass) {
        return bypass;
    }

    return await authFlow(request);
};

/**
 * Resets config variable, helps with testing
 */
const reset = () => {
    discoveryDocument = null;
    jwks = null;
    config = null;
};

module.exports = {
    verifyAD,
    reset,
    blank,
};
