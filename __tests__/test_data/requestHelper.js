const validToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY0ODR9.lYMAsMaWeaPNaXJp0botIfALNCOmNwWH3353CYJjihQM81PPTwyjcmiAjw4T3RdlxfkOwcnBFZDIsJevwuRZ9Q";
const invalidToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1ODUzMDY4ODV9.LoU6Alt6ro-vToc0eELPGWRUYxfHdQX-GOcHSHOzomel86IeJMXipZHGyQxvulOjMIUGBdxdM77YJjJF9rkuYw";
const validAccessCodeToken =
    "dev---eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsZXZlbCI6MSwiYWNjZXNzQ29kZSI6Ik1BR0lDIiwic3RhY2tJZCI6IkVNRUEiLCJlbnYiOiJkZXYiLCJleHAiOjE2Mjg5MzM2NzUsImRvbWFpbiI6IkFDQyIsInByb3ZpZGVyIjoiUFJPVklERURfQUNDRVNTX0NPREUiLCJpYXQiOjE2Mjg4NDcyNzR9.XvyDfK8qxtmgKpeP8eHcb37PyGMNO0V6Nv7K9OanPTaInfLINJufcuFT1zGwn01Q18nkNeDb9UUqyT6WaCLSJq4u27KwcChA1Ctv1w6Vx0fyeEFcr5wgcRe4JbxedYYm_fwh5B8YZdxIpxFo7idynyVBYpQO5mTWrSdYU6mAURDZRNJc-DyMSUhN41WX3-1uMr6uz-11NChu9inl8tTxSTs_3x4Q_Cb3XJLFtB7NTVsi__n541cCMGOoO0I0Vx7rlbmRTLOpBfV7JPZ9DjtEdTODCYcr8bQt5gLOni1gxH34i0_zKZ8ICe2JjgylR95Nu9piW7DLA4bLgrmFQxbp1t44EAcK93Nr3NZhsjNg4eKYmFlje2SVXARqdfg6LAKxmRa0wZMY38gYOGccQbz_1r2aKIzt2X-MP7s1PgM-GFiY1thVC1VQWHbH4e0zredSK0ipAzYAb_6gZpll2FYqeNdhdV3Khw9cpLl7k5pbwMQmRBwnhVwYXzVEG_Nm0xBJ-yS4Es_k75odRHGNJK-M5HBHcXzjRD_shQWfV3v1RTMcPBXEmBEm3niiH3UJh7NtQOdehxNuTmFB4aB1iu_NLSq-ZuP3IPjuuEVqFhmS9rtEnAEiijo6lPptfBfbec2h_RWB56JWV76EuR0P-BxkYBUtk6RfNQ2rYBKd9HtgasM";

const tokenHeader = (token = validToken) => ({
    cookie: [{ value: `accessToken=${token}` }],
});

const multiCookieTokenHeader = (token = validToken) => ({
    cookie: [{ value: `accessToken=${token}; accessToken=stg---stg-test; accessToken=dev---dev-test` }],
});

const marketingTokenHeader = (token = validToken) => ({
    cookie: [{ value: `marketingToken=${token}` }],
    "X-ApiVersion": [{ value: "api" }],
});

const accessCodeHeader = (token = validToken) => ({
    cookie: [{ value: `accessCode=${token}` }],
});

const multipleMarketingTokenHeader = (token = validToken) => ({
    cookie: [{ value: `marketingToken=${token}; marketingToken=dev---dev-test; marketingToken=stg---stg-test` }],
    "X-ApiVersion": [{ value: "api" }],
});

const multipleAccessCodeHeader = (token = validToken) => ({
    cookie: [{ value: `accessCode=${token}; accessCode=dev---dev-test; accessCode=stg---stg-test` }],
});

const envVerificationToken = (cookie) => ({
    cookie: [{ value: cookie }],
});

const googleBotHeader = () => ({
    "user-agent": [
        { key: "User-Agent", value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    ],
    "x-forwarded-for": [{ key: "X-Forwarded-For", value: "66.249.66.1" }],
    cookie: [],
});

const request = (headers = tokenHeader(), uri = "/level-3/", querystring = "") => ({
    headers: {
        host: [
            {
                key: "Host",
                value: "example.org",
            },
        ],
        ...headers,
    },
    uri,
    querystring,
});

const requestBuilder = (headers = tokenHeader(), uri = "/level-3/", querystring = "") => ({
    Records: [
        {
            cf: {
                request: request(headers, uri, querystring),
            },
        },
    ],
});

module.exports = {
    requestBuilder,
    request,
    invalidToken,
    validToken,
    validAccessCodeToken,
    tokenHeader,
    envVerificationToken,
    multiCookieTokenHeader,
    marketingTokenHeader,
    multipleMarketingTokenHeader,
    accessCodeHeader,
    multipleAccessCodeHeader,
    googleBotHeader,
};
