const requests = require("../../services/generation/lifecycle/requests");
module.exports = async (req, res, next) => {
  try {
    // A cryptographically random capability authorizes only its own request.
    // It also works before the first create response has set a browser cookie.
    await requests.close(req.body?.token);
    res.status(202).json({ accepted: true });
  } catch (error) { next(error); }
};
