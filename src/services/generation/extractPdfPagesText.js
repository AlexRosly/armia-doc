const fs = require("fs/promises");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const normalizeText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const extractPdfPagesText = async (pdfPath) => {
  const absolutePath = path.resolve(pdfPath);
  const data = await fs.readFile(absolutePath);

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const items = Array.isArray(textContent.items) ? textContent.items : [];
    const text = normalizeText(
      items
        .map((item) => item.str || "")
        .filter(Boolean)
        .join(" "),
    );

    pages.push({
      pageNumber,
      text,
    });
  }

  return pages;
};

module.exports = extractPdfPagesText;
