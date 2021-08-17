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

const marketingTokenMockImpl = (
    urls = [],
    services = [],
    events = [],
    materials = [],
    provider = "PROVIDED_MARKETING",
) => {
    getAuthValidMock.mockResolvedValue({
        results: [
            {
                loginType: "ea-token",
                urls,
                services,
                events,
                materials,
                provider,
            },
            {}, // some invalid other token
        ],
    });
};

const {
    requestBuilder,
    validToken,
    marketingTokenHeader,
    multipleMarketingTokenHeader,
} = require("../test_data/requestHelper");
const { prodHandler } = require("../../src/index");

describe("cf-auth-fn#handler#marketing", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            prefix: "jmc",
            region: "EMEA",
            environment: "dev",
            standardizedEnv: "dev",
        });
        decodeMock.mockReturnValue({
            provider: "PROVIDED_MARKETING",
        });
    });
    afterEach(() => {
        getAuthValidMock.mockRestore();
    });

    it("should handle a marketing token for a page", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            token: "page_match",
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(["/testpage"], ["/services/contact_janssen/"]);

        const result = await prodHandler(
            requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/testpage.json"),
        );
        expect(result.uri).toEqual("/level-3/en-us/testpage.json");
        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
        expect(verifyMock).toBeCalledWith(
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q",
            expect.anything(),
            expect.anything(),
        );
    });

    it("should handle a marketing token for a page and a specific token", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            token: "page_match",
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(["/testpage"], ["/services/contact_janssen/"]);

        const result = await prodHandler(
            requestBuilder(multipleMarketingTokenHeader(validToken), "/level-3/en-us/testpage.json"),
        );
        expect(result.uri).toEqual("/level-3/en-us/testpage.json");
        expect(getAuthValidMock).toBeCalledWith("example.org", "dev-test", undefined, "api");
        expect(verifyMock).toBeCalledWith("dev-test", expect.anything(), expect.anything());
    });

    it("should handle a marketing token for the IOD service", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            token: "iod_match",
            title: "test",
            stackId: "EMEA",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, ["/services/contact_janssen/"]);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/contact_janssen/contact-us.json",
                    ),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/contact_janssen/contact-us.json");

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/contact_janssen.json"),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/contact_janssen.json");
        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
    });

    it("should handle a marketing token for the Request Materials service", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "request_materials_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, ["/services/request_materials/"]);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/request_materials/contact-us.json",
                    ),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/request_materials/contact-us.json");

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/request_materials.json"),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/request_materials.json");
        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
    });

    it("should handle a marketing token for the Media Center service", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "media_center_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, ["/services/media_center/"]);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/media_center/contact-us.json");

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/media_center.json"),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/media_center.json");

        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
    });

    it("should handle a marketing token for a specific event", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "event_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, undefined, ["BLT07893"]);

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/events/BLT07893.json"),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/events/BLT07893.json");

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/events/BLT07893.json"),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/events/BLT07893.json");

        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
    });

    it("should handle a marketing token for a specific material", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "event_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, undefined, undefined, ["BLT07893"]);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/request_materials/BLT07893.json",
                    ),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/request_materials/BLT07893.json");

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/request_materials/BLT07893.json",
                    ),
                )
            ).uri,
        ).toEqual("/level-3/en-us/services/request_materials/BLT07893.json");

        expect(getAuthValidMock).toBeCalledWith("example.org", validToken, undefined, "api");
    });

    it("should fail when the level is incorrect", async () => {
        verifyMock.mockReturnValue({
            level: 2,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "level_incorrect",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });
        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when the environment is incorrect", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "environment_not_match",
            env: "stg",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when the token domain is incorrect", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "domain_not_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "API",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when no url matches with the request", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "no_url_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when no service matches with the request", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "no_services_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when no events matches with the request", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "no_events_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, undefined, undefined);

        expect(
            (
                await prodHandler(
                    requestBuilder(marketingTokenHeader(validToken), "/level-3/en-us/services/events/BLT07893.json"),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when no materials matches with the request", async () => {
        verifyMock.mockReturnValue({
            level: 1,
            codsId: "1234HACP",
            title: "test",
            stackId: "EMEA",
            token: "no_events_match",
            env: "dev",
            exp: 1594708218.299,
            domain: "MAR",
            iat: 1594708218,
            provider: "PROVIDED_MARKETING",
        });

        marketingTokenMockImpl(undefined, undefined, undefined, undefined);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/request_materials/BLT07893.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should fail when the token domain is incorrect", async () => {
        verifyMock.mockImplementation(() => {
            throw new Error("Invalid token");
        });

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        marketingTokenHeader(validToken),
                        "/level-3/en-us/services/media_center/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });
});
