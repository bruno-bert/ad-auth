const reverseDNSLookup = require("../../src/providers/reverse-dns-lookup");

describe("cf-auth-fn#reverseDNSLookup", () => {
    it("should do a successful reverse DNS lookup of a GoogleBot IP", async () => {
        expect(await reverseDNSLookup("66.249.66.1", "googlebot.com")).toBeTruthy();
    });

    it("should do a unsuccessful reverse DNS lookup of a other IPs", async () => {
        expect(await reverseDNSLookup("1.1.1.1", "googlebot.com")).toBeFalsy();
    });

    it("should do a unsuccessful reverse DNS lookup with invalid IPs", async () => {
        expect(await reverseDNSLookup("rm -rf", "googlebot.com")).toBeFalsy();
    });

    it("should support IPv6s", async () => {
        expect(await reverseDNSLookup("2a00:1450:400e:80a::200e", "google.com")).toBeFalsy();
    });
});
