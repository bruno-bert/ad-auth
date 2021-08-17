const disocverySpy = jest.fn();
const authorizationSpy = jest.fn();
const jwksSpy = jest.fn();

jest.mock("../src/providers/azure/azureApi", () => ({
    getDiscoverDocument: disocverySpy,
    getJwks: jwksSpy,
    postAuthorization: authorizationSpy,
}));

const decodeMock = jest.fn();
const verifyMock = jest.fn();
const signMock = jest.fn();
jest.mock("jsonwebtoken", () => ({
    decode: decodeMock,
    verify: verifyMock,
    sign: signMock,
}));

const { verifyAD, reset } = require("../src/providers/azureAD");
const { getParameterMock } = require("../__mocks__/aws-sdk");
const { request, tokenHeader, envVerificationToken } = require("./test_data/requestHelper");

describe("provider#azureAD", () => {
    beforeEach(() => {
        disocverySpy.mockImplementation(() => ({
            authorization_endpoint: "microsofty.com",
            jwks_uri: "microsofty.com/jwks",
        }));

        authorizationSpy.mockImplementation(() => ({
            id_token: "",
        }));

        jwksSpy.mockImplementation(() => ({
            keys: [],
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        reset();
    });

    it("should handle a request without a token and redirect the user", async () => {
        const { result } = await verifyAD(request());
        expect(disocverySpy).toBeCalled();
        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("microsoft");
    });

    it("should request the right parameters", async () => {
        const { result } = await verifyAD(request());
        expect(disocverySpy).toBeCalled();
        expect(result.status).toBe("302");

        expect(getParameterMock).toBeCalledWith({ Name: "/jmc/aad/config/dev", WithDecryption: true });
        expect(getParameterMock).toBeCalledWith({ Name: "/jmc/aad/key/private", WithDecryption: true });
        expect(getParameterMock).toBeCalledWith({ Name: "/jmc/aad/key/public", WithDecryption: true });
        expect(getParameterMock).toBeCalledWith({ Name: "/jmc/aad/bypass/secret", WithDecryption: true });
    });

    it("should handle a request with an invalid bypass token", async () => {
        const input = request(envVerificationToken("testingToken=some_token; Max-Age=28800; Path=/"));
        const { result } = await verifyAD(input);
        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("microsoft");
    });

    it("should handle a request with a valid bypass token", async () => {
        const input = request(envVerificationToken("testingToken=secure_string; Max-Age=28800; Path=/"));
        const { result } = await verifyAD(input);
        expect(result.status).not.toBeDefined();
    });

    it("should handle a proper auth callback", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
            },
        }));

        const { result } = await verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    code: "some_code",
                    state: "/en-us",
                }).toString(),
            ),
        );

        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("/en-us");
    });

    it("should handle a proper request with token", async () => {
        const input = request(envVerificationToken("TOKEN=some_token; Max-Age=28800; Path=/"));
        const { result } = await verifyAD(input);
        expect(result.status).not.toBeDefined();
    });

    it("should throw an error when the discovery document was not found", async () => {
        disocverySpy.mockImplementationOnce(() => {});
        return expect(verifyAD(request())).rejects.toThrowError(
            "Internal server error: Unable to find JWK in discoverDocument",
        );
    });

    it("should throw an error when the auth/callback does not contain a code", async () => {
        const toResolve = verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    state: "/en-us",
                }).toString(),
            ),
        );

        return expect(toResolve).rejects.toThrowError("No code found in callback");
    });

    it("should throw an error when the auth/callback does contain an error", async () => {
        const toResolve = verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    error: "well oeps",
                    state: "/en-us",
                }).toString(),
            ),
        );

        return expect(toResolve).rejects.toThrowError("AZURE Provider: remote failed with error well oeps");
    });

    it("should redirect the user when his token has expired on auth/callback", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
            },
        }));

        verifyMock.mockImplementationOnce(() => {
            const error = new Error("TokenExpiredError");
            error.name = "TokenExpiredError";

            throw error;
        });

        const { result } = await verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    code: "some_code",
                    state: "/en-us",
                }).toString(),
            ),
        );

        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("microsoft");
    });

    it("should redirect the user when his token has expired", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
            },
        }));

        verifyMock.mockImplementationOnce(() => {
            const error = new Error("TokenExpiredError");
            error.name = "TokenExpiredError";

            throw error;
        });

        const input = request(envVerificationToken("TOKEN=some_token; Max-Age=28800; Path=/"));
        const { result } = await verifyAD(input);

        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("microsoft");
    });

    it("should throw an error when JWT validation fails", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
            },
        }));

        verifyMock.mockImplementationOnce(() => {
            throw new Error("Oeps");
        });

        const input = request(envVerificationToken("TOKEN=some_token; Max-Age=28800; Path=/"));

        return expect(verifyAD(input)).rejects.toThrowError("Oeps");
    });

    it("should throw an error when JWT validation fails on auth/callback", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
                level: 2,
            },
        }));

        verifyMock.mockImplementationOnce(() => {
            throw new Error("Oeps");
        });

        const action = verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    code: "some_code",
                    state: "/en-us",
                }).toString(),
            ),
        );

        return expect(action).rejects.toThrowError("Oeps");
    });

    it("should return the host url when the state has not been set", async () => {
        decodeMock.mockImplementation(() => ({
            payload: {
                sub: "test",
            },
        }));

        const { result } = await verifyAD(
            request(
                tokenHeader(),
                "/auth/callback",
                new URLSearchParams({
                    code: "some_code",
                }).toString(),
            ),
        );

        expect(result.status).toBe("302");

        expect(result.headers.location[0].value).toBeDefined();
        expect(result.headers.location[0].value).toContain("https://example.org");
    });
});
