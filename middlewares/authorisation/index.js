const openDSU = require("opendsu");
const crypto = openDSU.loadApi("crypto");

function sendUnauthorizedResponse(req, res, reason, error) {
  console.error(`[Auth] [${req.method}] ${req.url} blocked: ${reason}`, error);
  res.statusCode = 403;
  res.end();
}

function Authorisation(server) {
  console.log(`Registering Authorisation middleware`);

  const config = require("../../config");
  const skipAuthorisation = config.getConfig("skipAuthorisation");

  const urlsToSkip = skipAuthorisation && Array.isArray(skipAuthorisation) ? skipAuthorisation : [];

  server.use(function (req, res, next) {
    const { url } = req;
    const jwt = req.headers.Authorization;

    const canSkipAuthorisation = urlsToSkip.some((urlToSkip) => url.indexOf(urlToSkip) === 0);
    if (canSkipAuthorisation) {
      next();
      return;
    }

    if (!jwt) {
      return sendUnauthorizedResponse(req, res, "Missing required Authorization header");
    }

    config.getTokenIssuers((err, tokenIssuers) => {
      if (err) {
        return sendUnauthorizedResponse(req, res, "error while getting token issuers", err);
      }

      crypto.verifyAuthToken(jwt, tokenIssuers, (error, isValid) => {
        if (error || !isValid) {
          return sendUnauthorizedResponse(req, res, "JWT could not be verified", error);
        }

        next();
      });
    });
  });
}

module.exports = Authorisation;
