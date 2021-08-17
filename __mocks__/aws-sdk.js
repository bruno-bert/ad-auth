const fs = require("fs");
const path = require("path");

const getParameterMock = jest.fn().mockImplementation(({ Name }) => {
    let response;
    switch (Name) {
        case "/jmc/aad/bypass/secret":
            response = "secure_string";
            break;
        case "/jmc/aad/config":
            response = fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8");
            break;
        case "/jmc/aad/config/dev":
            response = fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8");
            break;
        case "/jwm/aad/config/dev":
            response = fs.readFileSync(path.resolve(__dirname, "../config.json"), "utf8");
            break;
        case "/jmc/aad/key/private":
            response = "{}";
            break;
        case "/jmc/aad/key/public":
            response = "{}";
            break;
        case "/extensions/api/config/country/emea/dev":
            response = JSON.stringify({
                CSApiKey: "test",
                CSApiSecret: "some secret",
                ApiKey: "not needed here, but somewhere else",
                CSApiDeliveryToken: "more secret",
            });
            break;

        case "/jmc/regional/config/dev/EMEA":
            response = JSON.stringify({
                languageConfig: {
                    allowed: ["en-us"],
                    fallback: "en-us",
                },
                serviceMapping: {
                    "Request Materials": "request_materials/",
                    "Information on Demand": "contact_janssen/",
                    "Media Center": "media_center/",
                    "Product Glossary": "product_glossary/",
                    "News Center": "news_center/",
                    "Specialty Overview": "specialties/",
                    "Event Overview": "events/",
                },
            });
            break;
        default:
            throw new Error("Invalid parameter name", Name);
    }
    return {
        promise: () =>
            Promise.resolve({
                Parameter: {
                    Value: response,
                },
            }),
    };
});

class SSM {}
SSM.prototype.getParameter = getParameterMock;

module.exports = {
    SSM,
    getParameterMock,
};
