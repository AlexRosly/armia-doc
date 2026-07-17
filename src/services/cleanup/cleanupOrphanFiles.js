const fs = require("fs/promises");
const path = require("path");

const STORAGE_ROOT = path.resolve(__dirname, "../../../storage");
const STORAGE_DIRS = ["docx", "pdf", "armdoc"];

const ORPHAN_MAX_AGE_MS = Number(
  process.env.ORPHAN_FILE_MAX_AGE_MS || 30 * 60 * 1000,
);

const ALLOWED_EXTENSIONS = new Set([".docx", ".pdf", ".armdoc"]);

const shouldSkipFile = (entryName, extension) => {
  if (entryName === ".gitkeep") {
    return true;
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  return false;
};

const cleanupOrphanFiles = async () => {
  const now = Date.now();
  let deletedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const dirName of STORAGE_DIRS) {
    const dirPath = path.join(STORAGE_ROOT, dirName);

    let entries = [];

    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          `[cleanupOrphanFiles] failed to read directory: ${dirPath}`,
        );
        console.error(error.message);
      }
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        skippedCount += 1;
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();

      if (shouldSkipFile(entry.name, extension)) {
        skippedCount += 1;
        continue;
      }

      const filePath = path.join(dirPath, entry.name);

      try {
        const stat = await fs.stat(filePath);
        const ageMs = now - stat.mtimeMs;

        if (ageMs < ORPHAN_MAX_AGE_MS) {
          skippedCount += 1;
          continue;
        }

        await fs.unlink(filePath);
        deletedCount += 1;

        console.log(`[cleanupOrphanFiles] deleted orphan file: ${filePath}`);
      } catch (error) {
        if (error.code === "ENOENT") {
          skippedCount += 1;
          continue;
        }

        failedCount += 1;
        console.error(
          `[cleanupOrphanFiles] failed to process file: ${filePath}`,
        );
        console.error(error.message);
      }
    }
  }

  console.log(
    `[cleanupOrphanFiles] completed: deleted=${deletedCount}, skipped=${skippedCount}, failed=${failedCount}`,
  );
};

module.exports = cleanupOrphanFiles;
