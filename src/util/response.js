/**
 * Redirects the user to the specified location
 *
 * @param {string|number} status the status to be returned (should be either 302 or 301)
 * @param {string} location the location to redirect to
 * @param {string} message the description for the redirection
 */
const redirectResponse = (status, location, message) => ({
    status: `${status}`,
    statusDescription: message,
    headers: {
        location: [
            {
                key: "Location",
                value: location,
            },
        ],
    },
});

module.exports = {
    redirectResponse,
};
