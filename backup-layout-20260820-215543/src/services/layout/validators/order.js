const { normalizeText, pushViolation } = require("./common");

const findOccurrences = (pages, marker) => {
  const needle = normalizeText(marker).toLowerCase();
  if (!needle) return [];

  const hits = [];
  for (const page of pages) {
    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex++) {
      const text = normalizeText(page.lines[lineIndex].text).toLowerCase();
      if (text.includes(needle)) {
        hits.push({ pageNumber: page.pageNumber, lineIndex, text });
      }
    }
  }
  return hits;
};

const isPageNumberOnly = (text) =>
  /^[-–—]?\s*\d+\s*[-–—]?$/.test(normalizeText(text));

const validateNakazuiuRules = (pages, markers, violations) => {
  const occurrences = findOccurrences(pages, markers.nakazuiu || "НАКАЗУЮ:");

  if (!occurrences.length) {
    pushViolation(
      violations,
      "NAKAZUIU_MISSING",
      "У згенерованому наказі не знайдено 'НАКАЗУЮ:'",
      null,
    );
    return;
  }

  for (const occurrence of occurrences) {
    const page = pages.find(
      (item) => item.pageNumber === occurrence.pageNumber,
    );
    if (!page) continue;

    const linesAfter = page.lines
      .slice(occurrence.lineIndex + 1)
      .map((line) => normalizeText(line.text))
      .filter((text) => text && !isPageNumberOnly(text));

    if (linesAfter.length === 0) {
      pushViolation(
        violations,
        "NAKAZUIU_LAST_LINE",
        "'НАКАЗУЮ:' залишено без тексту після нього на цій сторінці",
        page.pageNumber,
        { linesAfterCount: 0 },
      );
    } else if (linesAfter.length < 2) {
      pushViolation(
        violations,
        "NAKAZUIU_NOT_ENOUGH_LINES_AFTER",
        "Після 'НАКАЗУЮ:' немає мінімум 2 рядків тексту на цій сторінці",
        page.pageNumber,
        { linesAfterCount: linesAfter.length },
      );
    }
  }
};

const sortHits = (hits) =>
  hits.slice().sort((a, b) =>
    a.pageNumber === b.pageNumber
      ? a.lineIndex - b.lineIndex
      : a.pageNumber - b.pageNumber,
  );

const lastHit = (hits) => {
  const sorted = sortHits(hits);
  return sorted.length ? sorted[sorted.length - 1] : null;
};

const buildNameMarkers = (markers = {}) => {
  const first = normalizeText(markers.signerFirstName);
  const last = normalizeText(markers.signerLastName);
  const full = normalizeText(markers.signerFullName);
  return [...new Set([
    full,
    first && last ? `${first} ${last}` : "",
    first && last ? `${last} ${first}` : "",
    last,
    first,
  ].filter(Boolean))];
};

const findSignatureReference = (pages, markers) => {
  const names = buildNameMarkers(markers);
  if (!names.length) return null;

  // Prefer the last surname/full-name occurrence. Text in the order body may
  // mention the commander's position or rank, so those are not global anchors.
  const surname = normalizeText(markers.signerLastName);
  const primaryNames = surname
    ? names.filter((name) => name.toLowerCase().includes(surname.toLowerCase()))
    : names;
  const primaryHits = primaryNames.flatMap((name) =>
    findOccurrences(pages, name).map((hit) => ({ ...hit, marker: name })),
  );
  const primaryReference = lastHit(primaryHits);
  if (primaryReference) return primaryReference;

  const fallbackHits = names.flatMap((name) =>
    findOccurrences(pages, name).map((hit) => ({ ...hit, marker: name })),
  );
  return lastHit(fallbackHits);
};

const findLocalHits = (page, markers, fromIndex, toIndex) => {
  const markerEntries = [
    ["position", markers.signerPosition],
    ["rank", markers.signerRank],
    ["firstName", markers.signerFirstName],
    ["lastName", markers.signerLastName],
    ["fullName", markers.signerFullName],
  ]
    .map(([key, value]) => [key, normalizeText(value).toLowerCase()])
    .filter(([, value]) => value);

  const hits = [];
  for (let i = Math.max(0, fromIndex); i <= Math.min(toIndex, page.lines.length - 1); i++) {
    const text = normalizeText(page.lines[i].text).toLowerCase();
    for (const [anchor, value] of markerEntries) {
      if (text.includes(value)) hits.push({ lineIndex: i, anchor, text });
    }
  }
  return hits;
};

const validateSignatureRules = (pages, markers, violations) => {
  const reference = findSignatureReference(pages, markers);
  const expectedName =
    normalizeText(markers.signerFullName) ||
    normalizeText(markers.signerLastName) ||
    normalizeText(markers.signerFirstName);
  if (!reference) {
    if (expectedName) {
      pushViolation(
        violations,
        "ORDER_SIGNATURE_NOT_FOUND",
        "У PDF наказу не знайдено ПІБ у блоці підпису",
        null,
      );
    }
    return;
  }

  const page = pages.find((item) => item.pageNumber === reference.pageNumber);
  if (!page) return;

  const localHits = findLocalHits(
    page,
    markers,
    reference.lineIndex - 12,
    reference.lineIndex + 4,
  );
  const signatureStartIndex = localHits.length
    ? Math.min(reference.lineIndex, ...localHits.map((hit) => hit.lineIndex))
    : reference.lineIndex;

  const linesBefore = page.lines
    .slice(0, signatureStartIndex)
    .map((line) => normalizeText(line.text))
    .filter((text) => text && !isPageNumberOnly(text));

  if (linesBefore.length < 2) {
    pushViolation(
      violations,
      "ORDER_SIGNATURE_WITHOUT_CONTEXT",
      "Перед блоком підпису на сторінці немає мінімум 2 рядків тексту",
      page.pageNumber,
      { linesBeforeCount: linesBefore.length },
    );
  }

  if (page.pageNumber <= 1 || signatureStartIndex > 4) return;

  const previousPage = pages.find(
    (item) => item.pageNumber === page.pageNumber - 1,
  );
  if (!previousPage) return;

  const previousTailStart = Math.max(0, previousPage.lines.length - 5);
  const previousTailHits = findLocalHits(
    previousPage,
    markers,
    previousTailStart,
    previousPage.lines.length - 1,
  ).filter((hit) => ["position", "rank", "firstName", "lastName", "fullName"].includes(hit.anchor));

  if (previousTailHits.length) {
    pushViolation(
      violations,
      "ORDER_SIGNATURE_BLOCK_SPLIT",
      "Блок підпису наказу розірваний між сторінками",
      previousPage.pageNumber,
      { pages: [previousPage.pageNumber, page.pageNumber] },
    );
  }
};

const validateOrderLayoutRules = (pages, context = {}, violations) => {
  const markers = context.markers || {};
  validateNakazuiuRules(pages, markers, violations);
  validateSignatureRules(pages, markers, violations);
};

module.exports = validateOrderLayoutRules;
