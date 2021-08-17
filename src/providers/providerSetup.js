const { janrainHcpProvider } = require("./janrainHcp");
const { janrainPatientProvider } = require("./janrainPatient");

const PROVIDER_SETUP = {
    JMC: {
        JANRAIN_HCP: janrainHcpProvider,
        PROVIDED_MARKETING: janrainHcpProvider,
        PROVIDED_ANONYMOUS: janrainHcpProvider,
    },
    JWM: {
        JANRAIN_PATIENT: janrainPatientProvider,
        PROVIDED_ACCESS_CODE: janrainPatientProvider,
    },
};

module.exports = {
    PROVIDER_SETUP,
};
