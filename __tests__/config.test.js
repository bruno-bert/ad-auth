const axiosGetMock = jest.fn();
jest.mock("axios");

const axios = require("axios");
axios.default.get = axiosGetMock;

const { getConfig, getPublicKey } = require("../src/config");

describe("config#getConfig", () => {
    it("should return the right config", () => {
        expect(getConfig()).toEqual({
            environment: "dev",
            prefix: "jmc",
            logLevel: "info",
            region: "EMEA",
            standardizedEnv: "dev",
            googlebot: { allowLevel2: true },
            wwwRedirEnabled: true,
            domain: "https://dev.master.janssenmedicalcloud.eu",
        });
    });
});

describe("config#getPublicKey", () => {
    it("should return the right config", async () => {
        axiosGetMock.mockReturnValue({
            data: "some-key",
        });
        const result = await getPublicKey();
        expect(result).toEqual("some-key");
    });
});
