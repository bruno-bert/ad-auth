const { SSM } = require("aws-sdk");
const ssm = new SSM({ region: "eu-west-1" });

const { LOGGER } = require("../../LOGGER");

const getParam = async (key) => {
    LOGGER.info(`Querying for param: %s`, key);

    const param = await ssm
        .getParameter({
            Name: key,
            WithDecryption: true,
        })
        .promise();

    LOGGER.debug(`Finished querying for param: %s`, key);

    return JSON.parse(param.Parameter.Value);
};

/**
 * Gets the aad configuration
 */
const fetchAdConfig = async (prefix, environment) => {
    LOGGER.debug(`Fetching AD Config`);
    const [configResponse, privateKeyResponse, publicKeyResponse] = await Promise.all([
        getParam(`/${prefix}/aad/config/${environment}`),
        getParam(`/jmc/aad/key/private`),
        getParam(`/jmc/aad/key/public`),
    ]);

    const config = {
        ...configResponse,
        ...privateKeyResponse,
        ...publicKeyResponse,
    };

    return config;
};

/**
 * Obtains the bypass secret from the parameter store, used by QA and other systems
 * that are unable to login through AzureAD
 */
const fetchBypassSecret = async () => {
    LOGGER.debug("Querying for param: /jmc/aad/bypass/secret");

    const configResponse = await ssm
        .getParameter({
            Name: "/jmc/aad/bypass/secret",
            WithDecryption: true,
        })
        .promise();

    return configResponse.Parameter.Value;
};

module.exports = {
    fetchAdConfig,
    fetchBypassSecret,
};
