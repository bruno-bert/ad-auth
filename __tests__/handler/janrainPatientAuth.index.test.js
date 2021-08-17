const getDiscoverDocumentMock = jest.fn();

jest.mock("../../src/providers/azure/azureApi", () => ({
    getDiscoverDocument: getDiscoverDocumentMock,
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
const getPublicKeyMock = jest.fn();
const getInfoMock = jest.fn();
jest.mock("../../src/config", () => ({
    getPublicKey: getPublicKeyMock,
    getConfig: getConfigMock,
    getInfo: getInfoMock,
}));

jest.mock("../../src/providers/marketing/marketingTokenApi", () => ({
    getAuthValid: getAuthValidMock,
}));

const { requestBuilder, tokenHeader, invalidToken, multiCookieTokenHeader } = require("../test_data/requestHelper");
const { handler, prodHandler } = require("../../src/index");

describe("cf-auth-fn#handler", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            region: "EMEA",
            environment: "dev",
            prefix: "jwm",
            standardizedEnv: "dev",
        });
        decodeMock.mockReturnValue({
            provider: "JANRAIN_PATIENT",
        });
        getPublicKeyMock.mockReturnValue("");
        getDiscoverDocumentMock.mockReturnValue({ jwks_uri: "test" });
        getInfoMock.mockReturnValue({
            version: "v1.0.0",
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return the request info", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(), "/info"));
        expect(result.status).toEqual("200");
        expect(result.body).toEqual(
            JSON.stringify({
                version: "v1.0.0",
            }),
        );
    });

    it("should pass-through a request where no auth token is required", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(), "/index.html"));
        expect(result.headers.cookie.length).toBe(0);
    });

    it("should pass-through a request with a working authentication token", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_PATIENT",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/restricted/"));

        expect(result.headers.cookie.length).toBe(0);
        expect(verifyMock).toBeCalledWith(
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            expect.anything(),
            expect.anything(),
        );
    });

    it("should pass-through a request with a working authentication token and a specific token", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_PATIENT",
        });
        const result = await prodHandler(requestBuilder(multiCookieTokenHeader(), "/restricted/"));

        expect(result.headers.cookie.length).toBe(0);
        expect(verifyMock).toBeCalledWith("dev-test", expect.anything(), expect.anything());
    });

    it("should pass-through a request with a working authentication token to restricted content", async () => {
        verifyMock.mockResolvedValue({
            provider: "JANRAIN_PATIENT",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/restricted/"));

        expect(result.headers.cookie.length).toBe(0);
    });

    it("should not pass-through a request with an invalid provider", async () => {
        verifyMock.mockResolvedValue({
            provider: "PROVIDED_ANONYMOUS",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/restricted/"));

        expect(result.status).toBe("401");
    });

    it("should show a blank page when going to /blank", async () => {
        const result = await handler(requestBuilder({}, "/blank"));
        expect(result.status).toBe("200");
    });

    it("we do not handle pages on production that are not gated-content", async () => {
        const result = await prodHandler(requestBuilder({}, "/test-page"));
        expect(result.uri).toEqual("/test-page");
    });

    it("should throw a 401 when an env auth is required", async () => {
        const result = await handler(requestBuilder(tokenHeader(invalidToken), "/level-3/page-data/test-data.json"));
        expect(result.status).toBe("401");
    });

    it("should redirect when an env auth is required", async () => {
        verifyMock.mockRejectedValue(new Error("error"));
        const result = await handler(requestBuilder(tokenHeader(invalidToken), "/restricted/index.html"));
        expect(result.status).toBe("302");
    });

    it("should fail when an invalid token is used", async () => {
        verifyMock.mockRejectedValue(new Error("error"));
        const result = await prodHandler(requestBuilder(tokenHeader(invalidToken), "/restricted/"));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });

    it("should fail when no token is used", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(""), "/restricted/"));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });

    it("should fail when no cookie has been provided", async () => {
        const result = await prodHandler(requestBuilder({}));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });
});
