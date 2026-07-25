const path = require("path");

const TMPFS_BASE_PATH = process.env.TMPFS_BASE_PATH || "/dev/shm/armiadoc";
const PERSISTENT_BASE_PATH =
  process.env.PERSISTENT_BASE_PATH || "/var/www/armiadoc/storage/generated";

module.exports = {
  TMPFS_BASE_PATH,
  PERSISTENT_BASE_PATH,
};
