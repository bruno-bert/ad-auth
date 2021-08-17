const { default: Axios } = require("axios");

const { LOGGER } = require("../../LOGGER");

/**
 * Triggers the backend_services auth/valid call to get the pages that
 * the accessCode token is allowed to access.
 *
 * @param {string} host the host url
 * @param {string} accessCode the accessCode to passthrough
 * @param {string} authToken optional the auth token for caching (to mimic the request from the frontend)
 */
const getAuthValid = async (host, accessCode, authToken) => {
    let cookie = `accessCode=${accessCode}`;

    // This will be undefined currently as there is no requirement
    // for having both an accessCode and an authToken.
    // I've left this in as I suspect this requirement to materialize
    // in the near future.
    if (authToken) {
        cookie = `${cookie}; accessToken=${authToken}`;
    }

    try {
        const { data } = await Axios.get("/api/auth/valid", {
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
