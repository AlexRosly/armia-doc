// const crypto = require("crypto");
// const zlib = require("zlib");

// const algorithm = "aes-256-gcm";

// const secretKey = require("../../config/armdocSecret");

// const decrypt = (payload) => {
//   if (payload.format !== "ARMDOC") {
//     throw new Error("Invalid ARMDOC format");
//   }

//   if (payload.version !== 1) {
//     throw new Error("Unsupported ARMDOC version");
//   }

//   const decipher = crypto.createDecipheriv(
//     algorithm,
//     secretKey,
//     Buffer.from(payload.iv, "base64"),
//   );

//   decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

//   const decrypted = Buffer.concat([
//     decipher.update(Buffer.from(payload.data, "base64")),
//     decipher.final(),
//   ]);

//   const json = zlib.gunzipSync(decrypted);

//   return JSON.parse(json.toString("utf8"));
// };

// module.exports = decrypt;
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
