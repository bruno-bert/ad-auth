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

jest.mock("../../src/providers/marketing/marketingTokenApi", () => ({
    getAuthValid: getAuthValidMock,
}));

const { requestBuilder, tokenHeader, envVerificationToken } = require("../test_data/requestHelper");
const { handler } = require("../../src/index");

describe("cf-auth-fn#handler#azureAD", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            environment: "dev",
            region: "emea",
            prefix: "jmc",
            standardizedEnv: "dev",
            googlebot: { allowLevel2: true },
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should handle a request to start the authentication flow", async () => {
        const result = await handler(requestBuilder(tokenHeader(), "/pizza"));

        expect(result.status).toBe("302");
    });

    it("should handle a request to start the authentication flow for a .html page", async () => {
        const result = await handler(requestBuilder(tokenHeader(), "/pizza.html"));

        expect(result.status).toBe("302");
    });

    it("should handle a request to start the authentication flow a page that ends in /", async () => {
        const result = await handler(requestBuilder(tokenHeader(), "/pizza/"));

        expect(result.status).toBe("302");
    });

    it("should handle a request and throw a access denied for a other page", async () => {
        const result = await handler(requestBuilder(tokenHeader(), "/pizza.json"));

        expect(result.status).toBe("401");
    });

    it("should handle a request with a valid bypass token and to level-3 content", async () => {
        verifyMock.mockResolvedValue({
            provider: "JANRAIN_HCP",
            level: 3,
        });
        decodeMock.mockReturnValue({
            provider: "JANRAIN_HCP",
        });
        const input = requestBuilder(
            envVerificationToken(
                "testingToken=secure_string; Max-Age=28800; Path=/; accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            ),
        );
        const result = await handler(input);
        expect(result.status).not.toBeDefined();
    });

    it("should handle a request with a valid bypass token and to level-2 content with level 3 token", async () => {
        verifyMock.mockResolvedValue({
            provider: "JANRAIN_HCP",
            level: 3,
        });
        decodeMock.mockReturnValue({
            provider: "JANRAIN_HCP",
        });
        const input = requestBuilder(
            envVerificationToken(
                "testingToken=secure_string; Max-Age=28800; Path=/; accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            ),
            "/level-2/",
        );
        const result = await handler(input);
        expect(result.status).not.toBeDefined();
    });

    it("should fail a request with a valid bypass token and to level-3 content with level 2 token", async () => {
        verifyMock.mockResolvedValue({
            level: 2,
        });
        decodeMock.mockReturnValue({
            provider: "JANRAIN_HCP",
        });
        const input = requestBuilder(
            envVerificationToken(
                "testingToken=secure_string; Max-Age=28800; Path=/; accessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            ),
            "/level-3/",
        );
        const result = await handler(input);
        expect(result.status).toBe("401");
    });

    it("should handle a request with a valid bypass token but no auth-token", async () => {
        const input = requestBuilder(envVerificationToken("testingToken=secure_string; Max-Age=28800; Path=/"));
        const result = await handler(input);
        expect(result).toEqual({
            status: "401",
            statusDescription: "Unauthorized",
        });
    });

    it("should handle a request with a valid bypass token to public content", async () => {
        const input = requestBuilder(
            envVerificationToken("testingToken=secure_string; Max-Age=28800; Path=/"),
            "/pizza",
        );
        const result = await handler(input);
        expect(result.status).toBeUndefined();
    });
});
