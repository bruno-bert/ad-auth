jest.mock("../../src/providers/azure/azureApi", () => ({
    getDiscoverDocument: jest.fn().mockReturnValue({ jwks_uri: "test" }),
    getJwks: jest.fn(),
}));

const decodeMock = jest.fn();
const verifyMock = jest.fn();
const signMock = jest.fn();

jest.mock("jsonwebtoken", () => ({
    decode: decodeMock,
    verify: verifyMock,
    sign: signMock,
}));

const getAuthValidMock = jest.fn();
const getConfigMock = jest.fn();
jest.mock("../../src/config", () => ({
    getPublicKey: jest.fn().mockReturnValue(""),
    getConfig: getConfigMock,
}));

jest.mock("../../src/providers/accessCode/accessCodeApi", () => ({
    getAuthValid: getAuthValidMock,
}));

const { requestBuilder, validAccessCodeToken, accessCodeHeader } = require("../test_data/requestHelper");
const { prodHandler } = require("../../src/index");

describe("cf-auth-fn#handler#wwwRedirection", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            prefix: "jmc",
            region: "emea",
            environment: "dev",
            standardizedEnv: "dev",
            wwwRedirEnabled: true,
        });
    });
    afterEach(() => {
        getAuthValidMock.mockRestore();
    });

    it("should handle an www redirect for a page", async () => {
        const result = await prodHandler(requestBuilder(accessCodeHeader(validAccessCodeToken), "/test/index.html"));
        expect(result.headers.location[0].value).toEqual("https://www.example.org/test/index.html");
        expect(result.status).toEqual("302");
        expect(result.statusDescription).toEqual("www. redirect");
    });

    it("should handle an www redirect for a page with query string parameters", async () => {
        const result = await prodHandler(
            requestBuilder(accessCodeHeader(validAccessCodeToken), "/test/index.html", "test=oke"),
        );
        expect(result.headers.location[0].value).toEqual("https://www.example.org/test/index.html?test=oke");
        expect(result.status).toEqual("302");
        expect(result.statusDescription).toEqual("www. redirect");
    });

    it("should handle an www redirect for a page with query string parameters and config set to 301", async () => {
        getConfigMock.mockReturnValue({
            prefix: "jmc",
            region: "emea",
            environment: "dev",
            standardizedEnv: "dev",
            wwwRedirEnabled: "301",
        });

        const result = await prodHandler(
            requestBuilder(accessCodeHeader(validAccessCodeToken), "/test/index.html", "test=oke"),
        );
        expect(result.headers.location[0].value).toEqual("https://www.example.org/test/index.html?test=oke");
        expect(result.status).toEqual("301");
        expect(result.statusDescription).toEqual("www. redirect");
    });

    it("should not redirect when redirect is not enabled", async () => {
        getConfigMock.mockReturnValue({
            prefix: "jmc",
            region: "emea",
            environment: "dev",
            standardizedEnv: "dev",
            wwwRedirEnabled: false,
        });

        const result = await prodHandler(
            requestBuilder(accessCodeHeader(validAccessCodeToken), "/test/index.html", "test=oke"),
        );
        expect(result.status).toEqual(undefined);
        expect(result.uri).toEqual("/test/index.html");
    });

    it("should not add www. when it is already set", async () => {
        const result = await prodHandler(requestBuilder({ host: [{ value: "www.example.org" }] }, "/test/index.html"));
        expect(result.status).toEqual(undefined);
        expect(result.uri).toEqual("/test/index.html");
    });
});
