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

const accessCodeMockImpl = (urls = [], services = []) => {
    getAuthValidMock.mockResolvedValue({
        results: [
            {
                loginType: "accessCode",
                urls,
                services,
            },
        ],
    });
};

const { requestBuilder, validAccessCodeToken, accessCodeHeader } = require("../test_data/requestHelper");
const { prodHandler } = require("../../src/index");

describe("cf-auth-fn#handler#accessCode", () => {
    beforeEach(() => {
        getConfigMock.mockReturnValue({
            prefix: "jwm",
            region: "emea",
            environment: "dev",
            standardizedEnv: "dev",
        });
        decodeMock.mockReturnValue({
            provider: "PROVIDED_ACCESS_CODE",
        });
    });
    afterEach(() => {
        getAuthValidMock.mockRestore();
    });

    it("should handle an accessCode for a page", async () => {
        verifyMock.mockReturnValue({
            accessCode: "qaac1",
            title: "access code 1",
            stackId: "emea",
            env: "dev",
            exp: 1594708218.299,
            domain: "ACC",
            iat: 1594708218,
            provider: "PROVIDED_ACCESS_CODE",
        });

        accessCodeMockImpl(["restricted/private-page---access-code-2", "restricted/"], undefined);

        const result = await prodHandler(
            requestBuilder(
                accessCodeHeader(validAccessCodeToken),
                "/restricted/en-us/restricted/slug-for-landing-page-generated-at-build-time.json",
            ),
        );
        expect(result.uri).toEqual("/restricted/en-us/restricted/slug-for-landing-page-generated-at-build-time.json");
        expect(getAuthValidMock).toBeCalledWith(
            "example.org",
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6MSwiYWNjZXNzQ29kZSI6Ik1BR0lDIiwic3RhY2tJZCI6IkVNRUEiLCJlbnYiOiJkZXYiLCJleHAiOjE2Mjg5MzM2NzUsImRvbWFpbiI6IkFDQyIsInByb3ZpZGVyIjoiUFJPVklERURfQUNDRVNTX0NPREUiLCJpYXQiOjE2Mjg4NDcyNzR9.XvyDfK8qxtmgKpeP8eHcb37PyGMNO0V6Nv7K9OanPTaInfLINJufcuFT1zGwn01Q18nkNeDb9UUqyT6WaCLSJq4u27KwcChA1Ctv1w6Vx0fyeEFcr5wgcRe4JbxedYYm_fwh5B8YZdxIpxFo7idynyVBYpQO5mTWrSdYU6mAURDZRNJc-DyMSUhN41WX3-1uMr6uz-11NChu9inl8tTxSTs_3x4Q_Cb3XJLFtB7NTVsi__n541cCMGOoO0I0Vx7rlbmRTLOpBfV7JPZ9DjtEdTODCYcr8bQt5gLOni1gxH34i0_zKZ8ICe2JjgylR95Nu9piW7DLA4bLgrmFQxbp1t44EAcK93Nr3NZhsjNg4eKYmFlje2SVXARqdfg6LAKxmRa0wZMY38gYOGccQbz_1r2aKIzt2X-MP7s1PgM-GFiY1thVC1VQWHbH4e0zredSK0ipAzYAb_6gZpll2FYqeNdhdV3Khw9cpLl7k5pbwMQmRBwnhVwYXzVEG_Nm0xBJ-yS4Es_k75odRHGNJK-M5HBHcXzjRD_shQWfV3v1RTMcPBXEmBEm3niiH3UJh7NtQOdehxNuTmFB4aB1iu_NLSq-ZuP3IPjuuEVqFhmS9rtEnAEiijo6lPptfBfbec2h_RWB56JWV76EuR0P-BxkYBUtk6RfNQ2rYBKd9HtgasM",
            undefined,
        );
        expect(verifyMock).toBeCalledWith(
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6MSwiYWNjZXNzQ29kZSI6Ik1BR0lDIiwic3RhY2tJZCI6IkVNRUEiLCJlbnYiOiJkZXYiLCJleHAiOjE2Mjg5MzM2NzUsImRvbWFpbiI6IkFDQyIsInByb3ZpZGVyIjoiUFJPVklERURfQUNDRVNTX0NPREUiLCJpYXQiOjE2Mjg4NDcyNzR9.XvyDfK8qxtmgKpeP8eHcb37PyGMNO0V6Nv7K9OanPTaInfLINJufcuFT1zGwn01Q18nkNeDb9UUqyT6WaCLSJq4u27KwcChA1Ctv1w6Vx0fyeEFcr5wgcRe4JbxedYYm_fwh5B8YZdxIpxFo7idynyVBYpQO5mTWrSdYU6mAURDZRNJc-DyMSUhN41WX3-1uMr6uz-11NChu9inl8tTxSTs_3x4Q_Cb3XJLFtB7NTVsi__n541cCMGOoO0I0Vx7rlbmRTLOpBfV7JPZ9DjtEdTODCYcr8bQt5gLOni1gxH34i0_zKZ8ICe2JjgylR95Nu9piW7DLA4bLgrmFQxbp1t44EAcK93Nr3NZhsjNg4eKYmFlje2SVXARqdfg6LAKxmRa0wZMY38gYOGccQbz_1r2aKIzt2X-MP7s1PgM-GFiY1thVC1VQWHbH4e0zredSK0ipAzYAb_6gZpll2FYqeNdhdV3Khw9cpLl7k5pbwMQmRBwnhVwYXzVEG_Nm0xBJ-yS4Es_k75odRHGNJK-M5HBHcXzjRD_shQWfV3v1RTMcPBXEmBEm3niiH3UJh7NtQOdehxNuTmFB4aB1iu_NLSq-ZuP3IPjuuEVqFhmS9rtEnAEiijo6lPptfBfbec2h_RWB56JWV76EuR0P-BxkYBUtk6RfNQ2rYBKd9HtgasM",
            expect.anything(),
            expect.anything(),
        );
    });

    it("should fail when an incorrect accessCode is given", async () => {
        verifyMock.mockReturnValue({
            accessCode: "bad-access-code",
            title: "bad access code",
            stackId: "emea",
            env: "dev",
            exp: 1594708218.299,
            domain: "ACC",
            iat: 1594708218,
            provider: "PROVIDED_ACCESS_CODE",
        });

        accessCodeMockImpl(["/testpage"], undefined);

        expect(
            (
                await prodHandler(
                    requestBuilder(
                        accessCodeHeader(validAccessCodeToken),
                        "/restricted/en-us/services/contact-request/contact-us.json",
                    ),
                )
            ).status,
        ).toEqual("401");
    });

    it("should handle accessCode token for service", async () => {
        verifyMock.mockReturnValue({
            accessCode: "ac1",
            title: "access code 1",
            stackId: "emea",
            env: "dev",
            exp: 1594708218.299,
            domain: "ACC",
            iat: 1594708218,
            provider: "PROVIDED_ACCESS_CODE",
        });

        accessCodeMockImpl(undefined, ["/contact-request"]);

        const result = await prodHandler(
            requestBuilder(accessCodeHeader(validAccessCodeToken), "/restricted/en-us/contact-request.json"),
        );

        expect(result.uri).toEqual("/restricted/en-us/contact-request.json");
    });
});
