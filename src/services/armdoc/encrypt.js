const crypto = require("crypto");
const zlib = require("zlib");

const algorithm = "aes-256-gcm";

const secretKey = require("../../config/armdocSecret");

const encrypt = (json) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(json), "utf8"));

  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);

  return {
    // format: "ARMDOC",

    // version: 1,

    // algorithm,

    // iv: iv.toString("base64"),

    // authTag: cipher.getAuthTag().toString("base64"),

    // data: encrypted.toString("base64"),
    format: "ARMDOC",

    version: 1,

    documentType: json.documentType,

    compression: "gzip",

    algorithm,

    generator: "ARMDOC Backend v2",

    createdAt: new Date().toISOString(),

    iv: iv.toString("base64"),

    authTag: cipher.getAuthTag().toString("base64"),

    data: encrypted.toString("base64"),
  };
};

module.exports = encrypt;
