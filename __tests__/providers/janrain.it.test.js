const { verifyToken } = require("../../src/providers/janrainHcp");

// only used for testing
describe.skip("cf-auth-fn#verifyToken#integration", () => {
    it("should successfully verify a valid key", async () => {
        return expect(await verifyToken("{{PUT A TOKEN HERE}}", "dev.master.janssenmedicalcloud.eu")).toEqual({
            level: 2,
        });
    });
});
