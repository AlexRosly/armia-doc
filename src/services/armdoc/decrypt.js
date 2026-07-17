const crypto = require("crypto");
const zlib = require("zlib");

const secretKey = require("../../config/armdocSecret");

const MAX_UNCOMPRESSED_SIZE = 5 * 1024 * 1024;

const decrypt = (payload) => {
  try {
    const decipher = crypto.createDecipheriv(
      payload.algorithm,
      secretKey,
      Buffer.from(payload.iv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

    const encrypted = Buffer.from(payload.data, "base64");

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const uncompressed = zlib.gunzipSync(decrypted);

    //
    // ZIP BOMB
    //

    if (uncompressed.length > MAX_UNCOMPRESSED_SIZE) {
      throw new Error("Archive is too large.");
    }

    return JSON.parse(uncompressed.toString("utf8"));
  } catch {
    throw new Error("Invalid or corrupted ARMDOC.");
  }
};

module.exports = decrypt;
