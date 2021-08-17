const { verifyAD, blank } = require("./providers/azureAD");

const { getConfig, getInfo } = require("./config");
const { getProvider } = require("./providers/providerSelection");
const { PROVIDER_SETUP } = require("./providers/providerSetup");
const { doesARuleApply } = require("./providers/rules");
const { redirectResponse } = require("./util/response");

const { LOGGER } = require("./LOGGER");

/**
 * Check if the user has access to the non-prod envrionment
 *
 * @param {*} request the cloudfront request
 */
const validateAccessToEnvironment = async (request) => {
    return await verifyAD(request);
};

/**
 * Returns the provider function (handler) based on the prefix (config) and
 * provider name (request)
 *
 * @param {string} prefix the prefix used in the config
 * @param {string} provider the provider name
 * @returns
 */
const getProviderFn = (prefix, provider) => {
    LOGGER.debug("Getting provider %s for %s", provider, prefix);
    return PROVIDER_SETUP[prefix.toUpperCase()][provider];
};

/**
 * Handles the authentication flow for production environments
 * basically ignoring the Azure AD authentication
 *
 * @param {*} request the cloudfront request
 */
const processProd = async (request) => {
    const config = getConfig();
    if (doesARuleApply(request)) {
        const defaultProvider = PROVIDER_SETUP[config.prefix.toUpperCase()]["JANRAIN_HCP"];

        const accessTokenProvider = getProviderFn(config.prefix, getProvider(request, "accessToken"));
        const marketingTokenProvider = getProviderFn(config.prefix, getProvider(request, "marketingToken"));
        const accessCodeProvider = getProviderFn(config.prefix, getProvider(request, "accessCode"));

        const providerFn = accessTokenProvider || marketingTokenProvider || accessCodeProvider || defaultProvider;
        LOGGER.debug("Running provider FN (%s)", providerFn);
        await providerFn(request);
    }

    // remove the cookies for security reasons
    if (request.headers && request.headers.cookie) {
        request.headers.cookie = [];
    }

    // if no errors are throw and everything is fine then return the normal
    // request.
    return request;
};

/**
 * When www redirection is enabled this will check the host and if the host doesn't start with www.
 * it will force a redirect to the www. domain.
 *
 * @param {*} request the AWS Cloudfront Request
 */
const handleWwwRedir = (request) => {
    const { wwwRedirEnabled } = getConfig();
    if (wwwRedirEnabled) {
        const host = request.headers.host[0].value;
        LOGGER.debug(
            "www redirection enabled and checking, wwwRedirEnabledValue %s for host %s",
            wwwRedirEnabled,
            host,
        );

        // default to 302 for true as it's easier to adjust it later than when using 301 (permanent)
        const statusCode = wwwRedirEnabled === true ? 302 : wwwRedirEnabled;

        if (!host.startsWith("www.")) {
            const url = new URL(request.uri, "https://www." + host);
            const queryStringParams = request.querystring !== "" ? "?" + request.querystring : "";
            return redirectResponse(statusCode, url.toString() + queryStringParams, "www. redirect");
        }
    }
};

/**
 * Checks if the URI is a HTML page
 * @remark an URI that ends with an extension that ends in nothing or .html
 * @param {string} uri
 */
const checkIsHtml = (uri) => {
    const extension = uri.slice(((uri.lastIndexOf(".") - 1) >>> 0) + 2);
    return !extension || extension === "html";
};

/**
 * Creates the response for the /info endpoint
 * this will get the build version tag and git commit hash during
 * build time not deploy time.
 *
 * Creates a valid response object that is returned to the requester.
 *
 * @param {*} param0 AWS CloudFront Request object
 */
const info = ({ uri }) => {
    if (uri !== "/info") {
        return;
    }

    const data = getInfo();
    LOGGER.info("Returning info data", data);

    return {
        status: "200",
        statusDescription: "OK",
        body: JSON.stringify(data),
        headers: {
            "content-type": [
                {
                    key: "Content-Type",
                    value: "application/json",
                },
            ],
            "x-response-type": [
                {
                    key: "X-Response-Type",
                    value: "cf-info-fn-generated",
                },
            ],
        },
    };
};

/**
 * Handles the authentication flow for non-production environments.
 * Which is basically the Azure AD authentication + the normal production flow
 *
 * @param {*} request the cloudfront request
 */
const processNonProd = async (request) => {
    const blankPage = blank(request);
    if (blankPage) return blankPage;

    LOGGER.debug("Validating access to ", request.uri);

    const { result, requiresAdditionalAction } = await validateAccessToEnvironment(request);
    LOGGER.debug(JSON.stringify(result), requiresAdditionalAction, " response");

    if (requiresAdditionalAction) {
        LOGGER.debug("Requires additional action");
        LOGGER.debug(request.uri, "html check");
        if (!checkIsHtml(request.uri)) {
            LOGGER.debug(request.uri, "is not a html page");
            throw new Error(request.uri + " is not a HTML page");
        }
        return result;
    }

    return (await processProd(request)) || result;
};

/**
 * Handles incoming requests and validates if the authentication cookie contains
 * a valid JWT token. If yes it passes the request on to CF for further processing.
 *
 * It also checks if the env is a non prod one and if so, handles environment validation
 *
 * If not it will throw a 401 error (Unauthorized)
 *
 * @param {*} event obtains Records from the event
 */
const process = async ({ Records }, isProd = false) => {
    const config = getConfig();
    const { request } = Records[0].cf;

    // info before www redir as it will otherwise fail because it is redirected
    // to s3 as /info doesn't exist as a real page causing odd behaviour
    const infoResponse = info(request);
    if (infoResponse) return infoResponse;

    const wwwRedirResponse = handleWwwRedir(request);
    if (wwwRedirResponse) return wwwRedirResponse;

    LOGGER.debug("Using config:", config);

    try {
        return isProd ? await processProd(request) : await processNonProd(request);
    } catch (e) {
        LOGGER.error(e, "Error handling request");
        return {
            status: "401",
            statusDescription: "Unauthorized",
        };
    }
};

/**
 * handles non production requests
 *
 * @param {*} event
 */
const handler = (event) => {
    return process(event, false);
};

/**
 * Calls the handler method but disables the environment access validation for prod
 *
 * @param {*} event CloudFront event
 */
const prodHandler = (event) => {
    return process(event, true);
};

module.exports = {
    handler,
    prodHandler,
};
