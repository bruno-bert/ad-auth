const { default: Axios } = require("axios");

const { LOGGER } = require("../../LOGGER");

/**
 * Triggers the backend_services auth/valid call to get the urls and services
 * the marketing token is allowed to access.
 *
 * @param {string} host the host url
 * @param {string} marketingToken the marketingToken to passthrough
 * @param {string} authToken optional the auth token for caching (to mimic the request from the frontend)
 */
const getAuthValid = async (host, marketingToken, authToken, apiVersion = "api") => {
    let cookie = `marketingToken=${marketingToken}`;

    if (authToken) {
        cookie = `${cookie}; accessToken=${authToken}`;
    }

    try {
        const { data } = await Axios.get(`/${apiVersion}/auth/valid`, {
            baseURL: "https://" + host,
            headers: {
                cookie,
            },
            withCredentials: true,
        });

        return data;
    } catch (ex) {
        LOGGER.error("Failed to call auth/valid", ex);
        throw new Error("Failed to call auth/valid: " + ex.message);
    }
};

module.exports = {
    getAuthValid,
};
