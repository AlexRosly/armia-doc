const crypto = require("crypto");

const COOKIE_NAME = "aid.cid";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;

      const key = part.slice(0, index).trim();
      const value = decodeURIComponent(part.slice(index + 1).trim());
      acc[key] = value;
      return acc;
    }, {});

const ensureClientId = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie || "");
  let clientId = cookies[COOKIE_NAME];

  if (!clientId) {
    clientId = crypto.randomUUID();

    res.cookie(COOKIE_NAME, clientId, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: ONE_YEAR_MS,
    });
  }

  req.clientId = clientId;
  next();
};

module.exports = ensureClientId;
module.exports.COOKIE_NAME = COOKIE_NAME;
