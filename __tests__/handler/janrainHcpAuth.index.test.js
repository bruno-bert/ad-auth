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

const {
    requestBuilder,
    tokenHeader,
    invalidToken,
    multiCookieTokenHeader,
    googleBotHeader,
} = require("../test_data/requestHelper");
const { handler, prodHandler } = require("../../src/index");

describe("cf-auth-fn#handler", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            region: "EMEA",
            environment: "dev",
            prefix: "jmc",
            standardizedEnv: "dev",
            googlebot: { allowLevel2: true },
        });
        decodeMock.mockReturnValue({
            provider: "JANRAIN_HCP",
        });
    });
    it("should pass-through a request where no auth token is required", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(), "/index.html"));
        expect(result.headers.cookie.length).toBe(0);
    });

    it("should pass-through a request for iframe data that does not require auth", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(), "/iframes/random-app/index.html"));
        expect(result.headers.cookie.length).toBe(0);
    });

    it("should pass-through a request for iframe data that does require auth when auth level 3 is provided", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/iframes/anonymous/random-app/index.html"));
        expect(result.headers.cookie.length).toBe(0);
    });

    it("should pass-through a request for iframe data that does require auth when auth level 2 is provided", async () => {
        verifyMock.mockResolvedValue({
            level: 2,
            provider: "PROVIDED_ANONYMOUS",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/iframes/anonymous/random-app/index.html"));
        expect(result.headers.cookie.length).toBe(0);
    });

    it("should not pass-through a request for iframe data that does require auth when no auth is provided", async () => {
        verifyMock.mockResolvedValue({
            level: 1,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/iframes/anonymous/random-app1/index.html"));

        expect(result.status).toBe("401");
    });

    it("should not pass-through a request for iframe data that does require auth level 3 when auth level 2 is provided", async () => {
        verifyMock.mockResolvedValue({
            level: 2,
            provider: "PROVIDED_ANONYMOUS",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/iframes/private/random-app1/index.html"));

        expect(result.status).toBe("401");
    });

    it("should pass-through a request with a working authentication token", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder());

        expect(result.headers.cookie.length).toBe(0);
        expect(verifyMock).toBeCalledWith(
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            expect.anything(),
            expect.anything(),
        );
    });

    it("should pass-through a request with a working authentication token that is environment scoped", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder(multiCookieTokenHeader()));

        expect(result.headers.cookie.length).toBe(0);
        expect(verifyMock).toBeCalledWith("dev-test", expect.anything(), expect.anything());
    });

    it("should pass-through a request with an old token", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
        });
        const result = await prodHandler(requestBuilder());

        expect(result.headers.cookie.length).toBe(0);
    });

    it("should pass-through a request with a working authentication token to level 2 content", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/level-2/"));

        expect(result.headers.cookie.length).toBe(0);
    });

    it("should not pass-through a request with a working authentication token of level 2 to level 3 content", async () => {
        verifyMock.mockResolvedValue({
            level: 2,
            provider: "PROVIDED_ANONYMOUS",
        });
        const result = await prodHandler(requestBuilder());

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
        const result = await handler(requestBuilder(tokenHeader(invalidToken), "/level-3/index.html"));
        expect(result.status).toBe("302");
    });

    it("should fail when an invalid token is used", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader(invalidToken)));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });

    it("should fail when no token is used", async () => {
        const result = await prodHandler(requestBuilder(tokenHeader("")));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });

    it("should fail when no cookie has been provided", async () => {
        const result = await prodHandler(requestBuilder({}));

        expect(result).toEqual({ status: "401", statusDescription: "Unauthorized" });
    });
    it("should pass-through a request with a working authentication token to tcp content", async () => {
        verifyMock.mockResolvedValue({
            level: 3,
            provider: "JANRAIN_HCP",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/tcp/en-us/"));

        expect(result.headers.cookie.length).toBe(0);
    });

    it("should not pass-through a request with a working authentication token of level 2 to tcp content", async () => {
        verifyMock.mockResolvedValue({
            level: 2,
            provider: "PROVIDED_ANONYMOUS",
        });
        const result = await prodHandler(requestBuilder(tokenHeader(), "/tcp/"));

        expect(result.status).toBe("401");
    });

    it("should pass through a request from the googlebot for level-2 content", async () => {
        const request = requestBuilder(googleBotHeader(), "/level-2/");
        const result = await prodHandler(request);

        console.log(result);

        expect(result.headers.cookie.length).toBe(0);
    });
});
