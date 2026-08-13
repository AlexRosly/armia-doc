const fs = require("fs/promises");
const path = require("path");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const normalizeText = (value = "") => String(value).replace(/\s+/g, " ").trim();

const extractPdfPageTextItems = async (pdfPath) => {
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
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items = Array.isArray(textContent.items) ? textContent.items : [];

    const normalizedItems = items
      .map((item) => {
        const text = normalizeText(item.str || "");
        if (!text) return null;

        const transform = Array.isArray(item.transform) ? item.transform : [];
        const x = Number(transform[4] || 0);
        const y = Number(transform[5] || 0);
        const width = Number(item.width || 0);
        const height = Number(item.height || 0);

        return {
          text,
          x,
          y,
          width,
          height,
        };
      })
      .filter(Boolean);

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items: normalizedItems,
      text: normalizedItems.map((item) => item.text).join(" "),
    });
  }

  return pages;
};

module.exports = extractPdfPageTextItems;
