let publicKey = null;

const { default: Axios } = require("axios");
const config = require("../lambda-config.json");
const info = require("../info.json");

const { LOGGER } = require("./LOGGER");

/**
 * Triggers the backend_services auth/public-key call to get the public key to verify JWT token
 *
 * @param {string} host the host url
 */
const getPublicKey = async (host) => {
    if (!publicKey) {
        try {
            const { data } = await Axios.get("/api/auth/public-key", {
                baseURL: "https://" + host,
            });
            publicKey = data;
        } catch (ex) {
            publicKey = null;
            LOGGER.error("Failed to call auth/public-key", ex);
            throw new Error("Failed to get the public key for host: " + host);
        }
    }
    return publicKey;
};

/**
 * Returns the config from the lambda-config.json file
 * which is added during the deployment by the jenkins pipeline
 */
const getConfig = () => {
    return config;
};

const getInfo = () => {
    return info;
};

module.exports = {
    getPublicKey,
    getConfig,
    getInfo,
};
