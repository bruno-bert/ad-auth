const { getAuthValid } = require("../../src/providers/accessCode/accessCodeApi");

// only used for testing
describe.skip("cf-auth-fn#accessCodeApi#integration", () => {
    it("should successfully verify a valid accessCode", async () => {
        const valid = await getAuthValid(
            "dev.master.janssenwithme.eu",
            "dev---eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6MSwiYWNjZXNzQ29kZSI6Ik1BR0lDIiwic3RhY2tJZCI6IkVNRUEiLCJlbnYiOiJkZXYiLCJleHAiOjE2Mjg5MzM2NzUsImRvbWFpbiI6IkFDQyIsInByb3ZpZGVyIjoiUFJPVklERURfQUNDRVNTX0NPREUiLCJpYXQiOjE2Mjg4NDcyNzR9.XvyDfK8qxtmgKpeP8eHcb37PyGMNO0V6Nv7K9OanPTaInfLINJufcuFT1zGwn01Q18nkNeDb9UUqyT6WaCLSJq4u27KwcChA1Ctv1w6Vx0fyeEFcr5wgcRe4JbxedYYm_fwh5B8YZdxIpxFo7idynyVBYpQO5mTWrSdYU6mAURDZRNJc-DyMSUhN41WX3-1uMr6uz-11NChu9inl8tTxSTs_3x4Q_Cb3XJLFtB7NTVsi__n541cCMGOoO0I0Vx7rlbmRTLOpBfV7JPZ9DjtEdTODCYcr8bQt5gLOni1gxH34i0_zKZ8ICe2JjgylR95Nu9piW7DLA4bLgrmFQxbp1t44EAcK93Nr3NZhsjNg4eKYmFlje2SVXARqdfg6LAKxmRa0wZMY38gYOGccQbz_1r2aKIzt2X-MP7s1PgM-GFiY1thVC1VQWHbH4e0zredSK0ipAzYAb_6gZpll2FYqeNdhdV3Khw9cpLl7k5pbwMQmRBwnhVwYXzVEG_Nm0xBJ-yS4Es_k75odRHGNJK-M5HBHcXzjRD_shQWfV3v1RTMcPBXEmBEm3niiH3UJh7NtQOdehxNuTmFB4aB1iu_NLSq-ZuP3IPjuuEVqFhmS9rtEnAEiijo6lPptfBfbec2h_RWB56JWV76EuR0P-BxkYBUtk6RfNQ2rYBKd9HtgasM",
            undefined,
        );
        console.log("VALID: ", valid);
        console.log(valid.results[0].urls);
    });
});
