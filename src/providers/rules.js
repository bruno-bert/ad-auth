const LEVEL_3_RULES = [/^\/level-3\//, /^\/tcp\//, /^\/iframes\/private\//];
const LEVEL_2_RULES = [/^\/level-2\//, /^\/iframes\/anonymous\//];
const RESTRICTED_RULES = [/^\/restricted\//];

const ALL_AUTH_RULES = [...LEVEL_2_RULES, ...LEVEL_3_RULES, ...RESTRICTED_RULES];

/**
 * Checks is the uri from the request matches any of the rule paths
 * So that we know when to apply authentication logic.
 *
 * @param {*} request the AWS Cloudfront request
 */
const doesARuleApply = (request) => {
    const { uri } = request;
    return uri && ALL_AUTH_RULES.some((v) => v.test(uri));
};

module.exports = {
    LEVEL_3_RULES,
    LEVEL_2_RULES,
    RESTRICTED_RULES,
    ALL_AUTH_RULES,
    doesARuleApply,
};
