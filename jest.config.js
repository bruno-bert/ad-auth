const base = require("../../jest.config.base.js");

module.exports = {
    ...base,
    roots: ["<rootDir>/", "<rootDir>/__tests__", "<rootDir>/__mocks__"],
    name: "cf-auth-fn",
    displayName: "Token Validator Lambda @ Edge",
    setupFiles: ["./__tests__/testSetup.js"],
};
