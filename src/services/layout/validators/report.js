const { normalizeText, pushViolation } = require("./common");

const findMarkerOccurrences = (pages, marker) => {
  const normalizedMarker = normalizeText(marker);
  const matches = [];

  if (!normalizedMarker) return matches;

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i++) {
      const lineText = normalizeText(page.lines[i].text);
      if (lineText.includes(normalizedMarker)) {
        matches.push({
          pageNumber: page.pageNumber,
          lineIndex: i,
          lineText,
        });
      }
    }
  }

  return matches;
};

const validateProshuRules = (pages, markers, violations) => {
  const proshu = normalizeText(markers.proshu || "ПРОШУ:");
  if (!proshu) return;

  const occurrences = findMarkerOccurrences(pages, proshu);

  for (const occurrence of occurrences) {
    const page = pages.find(
      (item) => item.pageNumber === occurrence.pageNumber,
    );
    if (!page) continue;

    const linesAfter = page.lines
      .slice(occurrence.lineIndex + 1)
      .filter((line) => normalizeText(line.text));

    if (occurrence.lineIndex === page.lines.length - 1) {
      pushViolation(
        violations,
        "PROSHU_LAST_LINE",
        "ПРОШУ: залишено останнім рядком сторінки",
        page.pageNumber,
      );
    }

    if (linesAfter.length < 2) {
      pushViolation(
        violations,
        "PROSHU_NOT_ENOUGH_LINES_AFTER",
        "Після ПРОШУ: немає мінімум 2 рядків прохальної частини",
        page.pageNumber,
        { linesAfterCount: linesAfter.length },
      );
    }
  }
};

const validateFoundationPhraseRules = (pages, markers, violations) => {
  const foundationPhrase = normalizeText(
    markers.foundationPhrase || "На підставі вищезазначеного,",
  );

  if (!foundationPhrase) return;

  const occurrences = findMarkerOccurrences(pages, foundationPhrase);

  for (const occurrence of occurrences) {
    const page = pages.find(
      (item) => item.pageNumber === occurrence.pageNumber,
    );
    if (!page) continue;

    const linesAfter = page.lines
      .slice(occurrence.lineIndex + 1)
      .filter((line) => normalizeText(line.text));

    if (linesAfter.length < 1) {
      pushViolation(
        violations,
        "FOUNDATION_PHRASE_HANGING",
        "Службова фраза 'На підставі вищезазначеного,' висить окремо",
        page.pageNumber,
      );
    }
  }
};

const collectSignatureAnchors = (markers = {}) => {
  return [
    { key: "signerPosition", value: markers.signerPosition },
    { key: "signerMilitaryUnit", value: markers.signerMilitaryUnit },
    { key: "signerRank", value: markers.signerRank },
    { key: "signerFullName", value: markers.signerFullName },
    {
      key: "signerDate",
      value: markers.signerDateFormatted || markers.signerDate,
    },
  ]
    .map((item) => ({
      ...item,
      normalized: normalizeText(item.value),
    }))
    .filter((item) => item.normalized);
};

const locateSignatureBlock = (pages, markers = {}) => {
  const anchors = collectSignatureAnchors(markers);
  const found = [];

  for (const page of pages) {
    for (let i = 0; i < page.lines.length; i++) {
      const lineText = normalizeText(page.lines[i].text);

      for (const anchor of anchors) {
        if (lineText.includes(anchor.normalized)) {
          found.push({
            pageNumber: page.pageNumber,
            lineIndex: i,
            anchor: anchor.key,
            text: lineText,
          });
        }
      }
    }
  }

  return found;
};

const validateSignatureRules = (pages, markers, violations) => {
  const signatureHits = locateSignatureBlock(pages, markers);

  if (!signatureHits.length) {
    return;
  }

  const pagesWithSignature = [
    ...new Set(signatureHits.map((hit) => hit.pageNumber)),
  ];

  if (pagesWithSignature.length > 1) {
    pushViolation(
      violations,
      "SIGNATURE_BLOCK_SPLIT",
      "Блок підпису розірваний між сторінками",
      pagesWithSignature[0],
      { pages: pagesWithSignature },
    );
  }

  const firstSignatureHit = signatureHits.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.lineIndex - b.lineIndex;
  })[0];

  const page = pages.find(
    (item) => item.pageNumber === firstSignatureHit.pageNumber,
  );
  if (!page) return;

  const linesBefore = page.lines
    .slice(0, firstSignatureHit.lineIndex)
    .filter((line) => normalizeText(line.text));

  const lastTwoBefore = linesBefore.slice(-2);

  if (lastTwoBefore.length < 2) {
    pushViolation(
      violations,
      "SIGNATURE_WITHOUT_CONTEXT",
      "Підпис перенесений без мінімум 2 рядків тексту перед ним",
      page.pageNumber,
      { linesBeforeCount: lastTwoBefore.length },
    );
  }

  const dateAnchor = collectSignatureAnchors(markers).find(
    (item) => item.key === "signerDate",
  );
  const fullNameAnchor = collectSignatureAnchors(markers).find(
    (item) => item.key === "signerFullName",
  );

  const dateHit = signatureHits.find((hit) => hit.anchor === "signerDate");
  const nameHit = signatureHits.find((hit) => hit.anchor === "signerFullName");

  if (dateAnchor?.normalized && dateHit && nameHit) {
    if (dateHit.pageNumber !== nameHit.pageNumber) {
      pushViolation(
        violations,
        "SIGN_DATE_DETACHED",
        "Дата підписання відірвана від підпису",
        dateHit.pageNumber,
      );
    }
  }
};

const validateReportLayoutRules = (pages, context = {}, violations) => {
  const markers = context.markers || {};

  validateProshuRules(pages, markers, violations);
  validateFoundationPhraseRules(pages, markers, violations);
  validateSignatureRules(pages, markers, violations);
};

module.exports = validateReportLayoutRules;
