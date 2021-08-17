const fs = require("fs");
const path = require("path");

const verifyMock = jest.fn();

jest.mock("jsonwebtoken", () => ({
    verify: verifyMock,
}));

jest.mock("../../src/config", () => ({
    getPublicKey: jest.fn().mockResolvedValue(fs.readFileSync(path.join(__dirname, "../test_data/test.public-key"))),
}));

const { verifyToken } = require("../../src/providers/janrainHcp");
const { invalidToken, validToken } = require("../test_data/requestHelper");

describe("cf-auth-fn#verifyToken", () => {
    it("should successfully verify a valid key", async () => {
        verifyMock.mockReturnValue({ level: 2 });
        return expect(await verifyToken(validToken)).toEqual({ level: 2 });
    });

    it("should fail on an invalid key", async () => {
        verifyMock.mockImplementation(async () => {
            throw new Error("invalid signature");
        });
        expect(verifyToken(invalidToken)).rejects.toThrow("invalid signature");
    });

    it("should fail when no key has been specified", async () => {
        expect(verifyToken("")).rejects.toThrow("No jwt token provided");
    });
});
