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

const sortHits = (hits = []) =>
  hits.slice().sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) {
      return a.pageNumber - b.pageNumber;
    }
    return a.lineIndex - b.lineIndex;
  });

const getLastHit = (hits = []) => {
  const sorted = sortHits(hits);
  return sorted.length ? sorted[sorted.length - 1] : null;
};

const validateProshuRules = (pages, markers, violations) => {
  const proshu = normalizeText(markers.proshu || "ПРОШУ:");
  if (!proshu) return;

  const occurrences = findMarkerOccurrences(pages, proshu);

  if (!occurrences.length) {
    pushViolation(
      violations,
      "PROSHU_MISSING",
      "У згенерованому рапорті не знайдено ПРОШУ:",
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
      .filter((line) => normalizeText(line.text));

    if (linesAfter.length === 0) {
      pushViolation(
        violations,
        "PROSHU_LAST_LINE",
        "ПРОШУ: залишено останнім рядком сторінки",
        page.pageNumber,
      );
    } else if (linesAfter.length < 2) {
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

const collectSignatureAnchors = (markers = {}) =>
  [
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

const getAnchorHits = (pages, anchor) =>
  findMarkerOccurrences(pages, anchor.normalized).map((hit) => ({
    ...hit,
    anchor: anchor.key,
  }));

const findClosestHit = (hits, reference) => {
  if (!reference || !hits.length) return null;

  return hits.slice().sort((a, b) => {
    const distanceA =
      Math.abs(a.pageNumber - reference.pageNumber) * 1000 +
      Math.abs(a.lineIndex - reference.lineIndex);
    const distanceB =
      Math.abs(b.pageNumber - reference.pageNumber) * 1000 +
      Math.abs(b.lineIndex - reference.lineIndex);
    return distanceA - distanceB;
  })[0];
};

const isPageNumberOnly = (value) => /^[-–—]?\s*\d+\s*[-–—]?$/.test(value);

const validateSignatureRules = (pages, markers, violations) => {
  const anchors = collectSignatureAnchors(markers);
  const nameAnchor = anchors.find((anchor) => anchor.key === "signerFullName");
  const dateAnchor = anchors.find((anchor) => anchor.key === "signerDate");

  const nameHits = nameAnchor ? getAnchorHits(pages, nameAnchor) : [];
  const dateHits = dateAnchor ? getAnchorHits(pages, dateAnchor) : [];
  const nameHit = getLastHit(nameHits);
  const signatureReference = nameHit || getLastHit(dateHits);

  if (nameAnchor && !nameHit) {
    pushViolation(
      violations,
      "SIGNATURE_NOT_FOUND",
      "У PDF рапорту не знайдено ПІБ у блоці підпису",
      null,
    );
    return;
  }

  // Посада, звання та назва військової частини можуть повторюватися в тексті
  // рапорту. Без ПІБ або дати вони не є надійною ознакою блоку підпису.
  if (!signatureReference) return;

  const signaturePage = pages.find(
    (page) => page.pageNumber === signatureReference.pageNumber,
  );
  if (!signaturePage) return;

  const dateHit = findClosestHit(dateHits, signatureReference);

  if (nameHit && dateHit && nameHit.pageNumber !== dateHit.pageNumber) {
    pushViolation(
      violations,
      "SIGN_DATE_DETACHED",
      "Дата підписання відірвана від підпису",
      dateHit.pageNumber,
      {
        namePage: nameHit.pageNumber,
        datePage: dateHit.pageNumber,
      },
    );
  }

  const windowStart = Math.max(0, signatureReference.lineIndex - 12);
  const windowEnd = Math.min(
    signaturePage.lines.length - 1,
    signatureReference.lineIndex + 4,
  );

  const localHits = [];
  for (const anchor of anchors) {
    const hits = getAnchorHits([signaturePage], anchor).filter(
      (hit) => hit.lineIndex >= windowStart && hit.lineIndex <= windowEnd,
    );
    localHits.push(...hits);
  }

  const signatureStartIndex = localHits.length
    ? Math.min(...localHits.map((hit) => hit.lineIndex))
    : signatureReference.lineIndex;

  const contextLines = signaturePage.lines
    .slice(0, signatureStartIndex)
    .map((line) => normalizeText(line.text))
    .filter((text) => text && !isPageNumberOnly(text));

  if (contextLines.length < 2) {
    pushViolation(
      violations,
      "SIGNATURE_WITHOUT_CONTEXT",
      "Підпис перенесений без мінімум 2 рядків тексту перед ним",
      signaturePage.pageNumber,
      { linesBeforeCount: contextLines.length },
    );
  }

  if (signatureReference.lineIndex <= 3 && signatureReference.pageNumber > 1) {
    const previousPage = pages.find(
      (page) => page.pageNumber === signatureReference.pageNumber - 1,
    );

    if (previousPage) {
      const previousTailStart = Math.max(0, previousPage.lines.length - 4);
      const splitAnchorKeys = new Set([
        "signerPosition",
        "signerMilitaryUnit",
        "signerRank",
      ]);

      const previousTailHit = anchors
        .filter((anchor) => splitAnchorKeys.has(anchor.key))
        .flatMap((anchor) => getAnchorHits([previousPage], anchor))
        .find((hit) => hit.lineIndex >= previousTailStart);

      if (previousTailHit) {
        pushViolation(
          violations,
          "SIGNATURE_BLOCK_SPLIT",
          "Блок підпису розірваний між сторінками",
          previousPage.pageNumber,
          { pages: [previousPage.pageNumber, signaturePage.pageNumber] },
        );
      }
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
