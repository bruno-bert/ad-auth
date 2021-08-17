const axios = require("axios");

const postAuthorization = async (tokenEndpoint, postData) => {
    const { data: authResult } = await axios.post(tokenEndpoint, postData);
    return authResult;
};

const getDiscoverDocument = async (discoveryDocumentUrl) => {
    const { data: discoveryResult } = await axios.get(discoveryDocumentUrl);
    return discoveryResult;
};

const getJwks = async (jwksUri) => {
    const { data: jwksResult } = await axios.get(jwksUri);
    return jwksResult;
};

module.exports = {
    postAuthorization,
    getDiscoverDocument,
    getJwks,
};
