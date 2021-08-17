const execute = require("async-execute");

const IPRegex = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;

const { LOGGER } = require("../LOGGER");

class ReverseDNSLookupError extends Error {
    get name() {
        return "ReverseDNSLookupError";
    }
}

/**
 * Throws errors on mismatches
 * @param  {String}    ip
 * @param  {[String]} domain
 * @return {undefined}
 */
async function source(ip, domains) {
    if (!IPRegex.test(ip)) {
        throw new ReverseDNSLookupError(`Not a valid IP: ${ip}`);
    }

    const forward = await execute(`host ${ip}`);
    const forwardRegex = new RegExp(`(${domains.join("|")}).?$`);
    if (!forwardRegex.test(forward)) {
        throw new ReverseDNSLookupError(
            `${ip} does not match domain ${domains.join(", ")}. (resolves to ${forward.split(" ").pop()})`,
        );
    }

    const backward = await execute(`host ${forward.split(" ").pop()}`);
    if (!new RegExp(`${ip}.?$`).test(backward)) {
        throw new ReverseDNSLookupError(`${backward} does not resolve back to ${ip}`);
    }
}

/**
 * Catch ReverseDNSLookupError and return boolean
 * @param  {String}    ip
 * @param  {...String} domain
 * @return {Boolean}
 */
async function reverseDNSLookup(ip, ...domains) {
    try {
        await source(ip, domains);
        return true;
    } catch (error) {
        if (error instanceof ReverseDNSLookupError) {
            LOGGER.info(error.message);
            return false;
        }
        throw error;
    }
}

reverseDNSLookup.source = source;

module.exports = reverseDNSLookup;
