const { normalizeText, pushViolation } = require("./common");

const normalizeComparable = (value = "") =>
  normalizeText(value)
    .normalize("NFC")
    .toLocaleLowerCase("uk-UA")
    // PDF.js may return a punctuation glyph as a separate text item. Joining
    // such items inserts a technical space before the punctuation.
    .replace(/\s+([:;,.])/g, "$1")
    .replace(/([([{«])\s+/g, "$1")
    .replace(/\s+([)\]}»])/g, "$1")
    // Some PDF fonts expose the Ukrainian section numeral "ІІ" as Latin
    // "II". Normalize only numeral-like tokens immediately before a dot.
    .replace(/(^|\s)[iі]{1,3}(?=\s*\.)/g, (match, prefix) => {
      const numeralLength = match.trim().length;
      return `${prefix}${"і".repeat(numeralLength)}`;
    });

const compactComparable = (value = "") =>
  normalizeComparable(value).replace(/[\s:;,.()[\]{}«»'"`\-–—]/g, "");

const isPageNumberOnly = (value) =>
  /^[-–—]?\s*\d+\s*[-–—]?$/.test(normalizeText(value));

const lineIsMeaningful = (line) => {
  const text = normalizeText(line?.text);
  return Boolean(text) && !isPageNumberOnly(text);
};

const globalLineIndex = (hit) =>
  (Number(hit?.pageNumber) || 0) * 10000 + (Number(hit?.lineIndex) || 0);

const findOccurrences = (pages, marker) => {
  const needle = normalizeComparable(marker);
  if (!needle) return [];

  const hits = [];
  for (const page of pages) {
    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex++) {
      const text = normalizeComparable(page.lines[lineIndex].text);
      if (text.includes(needle)) {
        hits.push({
          pageNumber: page.pageNumber,
          lineIndex,
          text,
        });
      }
    }
  }

  if (hits.length) return hits;

  // A single Word paragraph can be exposed by PDF.js as two or more visual
  // lines. Fall back to a bounded adjacent-line window only when the normal
  // single-line lookup found nothing. This preserves exact matches for totals
  // and repeated blocks while recovering split headings/positions.
  const compactNeedle = compactComparable(marker);
  if (compactNeedle.length < 2) return [];

  const markerWordCount = needle.split(/\s+/).filter(Boolean).length;
  const maxWindowLines = Math.min(6, Math.max(2, markerWordCount + 1));

  for (const page of pages) {
    for (let start = 0; start < page.lines.length; start++) {
      let matchedEnd = null;

      for (
        let end = start + 1;
        end < page.lines.length && end < start + maxWindowLines;
        end++
      ) {
        const text = normalizeComparable(
          page.lines
            .slice(start, end + 1)
            .map((line) => line.text)
            .join(" "),
        );
        if (
          text.includes(needle) ||
          compactComparable(text).includes(compactNeedle)
        ) {
          hits.push({
            pageNumber: page.pageNumber,
            lineIndex: start,
            lineEndIndex: end,
            text,
          });
          matchedEnd = end;
          break;
        }
      }

      if (matchedEnd != null) start = matchedEnd;
    }
  }

  return hits;
};

const firstOccurrence = (pages, marker) => findOccurrences(pages, marker)[0];

const pageForHit = (pages, hit) =>
  pages.find((page) => page.pageNumber === hit?.pageNumber);

const countMeaningfulBefore = (page, lineIndex) =>
  page.lines.slice(0, lineIndex).filter(lineIsMeaningful).length;

const countMeaningfulAfter = (page, lineIndex) =>
  page.lines.slice(lineIndex + 1).filter(lineIsMeaningful).length;

const lineGlobalIndex = (page, line) =>
  (Number(page?.pageNumber) || 0) * 10000 +
  (Number(line?.index) || 0);

const validateApprovalSealSpacing = (pages, violations) => {
  const firstPage = pages[0];
  const sealLine = firstPage?.lines.find(
    (line) => compactComparable(line.text) === "мп",
  );

  if (!sealLine) {
    pushViolation(
      violations,
      "ACT_APPROVAL_SEAL_MISSING",
      "У блоці затвердження не знайдено позначку 'М. П.'",
      firstPage?.pageNumber || null,
    );
    return;
  }

  const items = Array.isArray(sealLine.items) ? sealLine.items : [];
  if (
    items.some((item) =>
      /м\.\s+п\./iu.test(String(item.text || "")),
    )
  ) {
    return;
  }

  const pIndex = items.findIndex((item) =>
    /^п\./iu.test(normalizeComparable(item.text)),
  );
  const previousItem = pIndex > 0 ? items[pIndex - 1] : null;
  const pItem = pIndex >= 0 ? items[pIndex] : null;
  const visibleGapPt =
    previousItem && pItem
      ? Number(pItem.x) -
        (Number(previousItem.x) + Number(previousItem.width))
      : 0;

  if (Number.isFinite(visibleGapPt) && visibleGapPt >= 1) return;

  pushViolation(
    violations,
    "ACT_APPROVAL_SEAL_SPACE_MISSING",
    "У верхньому блоці Акта між 'М.' та 'П.' немає видимого пробілу",
    firstPage.pageNumber,
    { visibleGapPt: Number(visibleGapPt.toFixed(2)) },
  );
};

const maxInterItemGap = (line) => {
  const items = Array.isArray(line?.items) ? line.items : [];
  let maxGapPt = 0;
  let referenceHeightPt = 0;

  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1];
    const current = items[index];
    const gapPt =
      Number(current.x) -
      (Number(previous.x) + Number(previous.width));
    if (Number.isFinite(gapPt)) maxGapPt = Math.max(maxGapPt, gapPt);
    referenceHeightPt = Math.max(
      referenceHeightPt,
      Number(previous.height) || 0,
      Number(current.height) || 0,
    );
  }

  return { maxGapPt, referenceHeightPt };
};

const validateNarrativeSpacing = (pages, violations) => {
  const ranges = [
    ["І. Опис події:", "ІІ. Висновок комісії:"],
    ["ІІ. Висновок комісії:", "Голова комісії:"],
  ]
    .map(([startMarker, endMarker]) => ({
      startMarker,
      endMarker,
      start: firstOccurrence(pages, startMarker),
      end: firstOccurrence(pages, endMarker),
    }))
    .filter(({ start, end }) => start && end)
    .map((range) => ({
      ...range,
      startIndex: globalLineIndex(range.start),
      endIndex: globalLineIndex(range.end),
    }));

  for (const range of ranges) {
    for (const page of pages) {
      for (const line of page.lines) {
        const index = lineGlobalIndex(page, line);
        if (index <= range.startIndex || index >= range.endIndex) continue;
        if (!Array.isArray(line.items) || line.items.length < 3) continue;

        const { maxGapPt, referenceHeightPt } = maxInterItemGap(line);
        const ratio = maxGapPt / Math.max(1, referenceHeightPt);
        if (!(maxGapPt > 12 && ratio > 2)) continue;

        pushViolation(
          violations,
          "ACT_NARRATIVE_SPACING_DISTORTED",
          "У тексті Акта виявлено неприродно розтягнуті пробіли",
          page.pageNumber,
          {
            section: range.startMarker,
            maxGapPt: Number(maxGapPt.toFixed(2)),
            gapToFontHeightRatio: Number(ratio.toFixed(2)),
            text: normalizeText(line.text),
          },
        );
        break;
      }
    }
  }
};

const validateEmptyIntermediatePages = (pages, violations) => {
  for (const page of pages) {
    if (page.isLastPage) continue;
    if (page.lines.some(lineIsMeaningful)) continue;
    pushViolation(
      violations,
      "ACT_EMPTY_PAGE",
      "У Єдиному акті виявлено порожню сторінку",
      page.pageNumber,
    );
  }
};

const validateRequiredBlock = ({
  pages,
  marker,
  missingCode,
  hangingCode,
  missingMessage,
  hangingMessage,
  violations,
  minLinesAfter = 1,
}) => {
  const hits = findOccurrences(pages, marker);
  if (!hits.length) {
    pushViolation(violations, missingCode, missingMessage, null);
    return null;
  }

  for (const hit of hits) {
    const page = pageForHit(pages, hit);
    if (!page) continue;
    const linesAfter = countMeaningfulAfter(
      page,
      hit.lineEndIndex ?? hit.lineIndex,
    );
    if (linesAfter < minLinesAfter) {
      pushViolation(
        violations,
        hangingCode,
        hangingMessage,
        page.pageNumber,
        { linesAfterCount: linesAfter },
      );
    }
  }

  return hits[0];
};

const buildPersonNameCandidates = (person = {}) => {
  const firstName = normalizeText(person.firstName);
  const lastName = normalizeText(person.lastName);
  const fullName = normalizeText(person.fullName);

  return [
    fullName,
    firstName && lastName ? `${firstName} ${lastName}` : "",
    firstName && lastName ? `${lastName} ${firstName}` : "",
  ].filter(Boolean);
};

const findSplitNameReference = (pages, person, afterGlobalIndex) => {
  const firstName = normalizeText(person?.firstName);
  const lastName = normalizeText(person?.lastName);
  if (!firstName || !lastName) return null;

  const firstHits = findOccurrences(pages, firstName);
  const lastHits = findOccurrences(pages, lastName);
  const pairs = [];

  for (const firstHit of firstHits) {
    for (const lastHit of lastHits) {
      if (firstHit.pageNumber !== lastHit.pageNumber) continue;
      if (Math.abs(firstHit.lineIndex - lastHit.lineIndex) > 2) continue;
      const reference =
        firstHit.lineIndex >= lastHit.lineIndex ? firstHit : lastHit;
      if (globalLineIndex(reference) <= afterGlobalIndex) continue;
      pairs.push(reference);
    }
  }

  return pairs.sort((a, b) => globalLineIndex(a) - globalLineIndex(b))[0];
};

const findPersonReference = (pages, person, afterGlobalIndex) => {
  const candidates = buildPersonNameCandidates(person);
  const hits = candidates
    .flatMap((candidate) => findOccurrences(pages, candidate))
    .filter((hit) => globalLineIndex(hit) > afterGlobalIndex)
    .sort((a, b) => globalLineIndex(a) - globalLineIndex(b));

  return hits[0] || findSplitNameReference(pages, person, afterGlobalIndex);
};

const markerAppearsOnAdjacentPage = (pages, reference, marker) => {
  const pageNumbers = new Set([
    reference.pageNumber - 1,
    reference.pageNumber + 1,
  ]);
  return pages
    .filter((page) => pageNumbers.has(page.pageNumber))
    .some((page) => findOccurrences([page], marker).length > 0);
};

const validatePersonBlock = ({
  pages,
  person,
  afterGlobalIndex,
  label,
  violations,
  requireContext = false,
}) => {
  const expectedName =
    normalizeText(person?.fullName) ||
    normalizeText(
      [person?.firstName, person?.lastName].filter(Boolean).join(" "),
    );
  if (!expectedName) {
    return { reference: null, nextGlobalIndex: afterGlobalIndex };
  }

  const reference = findPersonReference(pages, person, afterGlobalIndex);
  if (!reference) {
    pushViolation(
      violations,
      "ACT_SIGNATURE_NOT_FOUND",
      `У PDF Акта не знайдено ПІБ у блоці підпису: ${label}`,
      null,
      { label, expectedName },
    );
    return { reference: null, nextGlobalIndex: afterGlobalIndex };
  }

  const page = pageForHit(pages, reference);
  if (!page) {
    return { reference, nextGlobalIndex: globalLineIndex(reference) };
  }

  const localStart = Math.max(0, reference.lineIndex - 8);
  const localEnd = Math.min(page.lines.length - 1, reference.lineIndex + 3);
  const fields = [
    ["position", person.position],
    ["rank", person.rank],
  ].filter(([, value]) => normalizeText(value));

  let blockStartIndex = reference.lineIndex;

  for (const [field, value] of fields) {
    const localHits = findOccurrences([page], value).filter(
      (hit) => hit.lineIndex >= localStart && hit.lineIndex <= localEnd,
    );

    if (localHits.length) {
      blockStartIndex = Math.min(
        blockStartIndex,
        ...localHits.map((hit) => hit.lineIndex),
      );
      continue;
    }

    const split = markerAppearsOnAdjacentPage(pages, reference, value);
    pushViolation(
      violations,
      split ? "ACT_SIGNATURE_BLOCK_SPLIT" : "ACT_SIGNATURE_FIELD_MISSING",
      split
        ? `Блок підпису розірваний між сторінками: ${label}`
        : `У блоці підпису не знайдено поле ${field}: ${label}`,
      reference.pageNumber,
      { label, field, expectedValue: normalizeText(value) },
    );
  }

  if (requireContext) {
    const linesBefore = countMeaningfulBefore(page, blockStartIndex);
    if (linesBefore < 2) {
      pushViolation(
        violations,
        "ACT_SIGNATURE_WITHOUT_CONTEXT",
        `Перед блоком підпису немає мінімум 2 рядків тексту: ${label}`,
        page.pageNumber,
        { label, linesBeforeCount: linesBefore },
      );
    }
  }

  return {
    reference,
    nextGlobalIndex: globalLineIndex(reference),
  };
};

const validatePeopleSection = ({
  pages,
  heading,
  headingLabel,
  people,
  violations,
  requireContextForFirst = false,
}) => {
  const headingHit = validateRequiredBlock({
    pages,
    marker: heading,
    missingCode: "ACT_SIGNATURE_HEADING_MISSING",
    hangingCode: "ACT_SIGNATURE_HEADING_HANGING",
    missingMessage: `Не знайдено заголовок блоку підписів: ${headingLabel}`,
    hangingMessage: `Заголовок блоку підписів залишився без підпису: ${headingLabel}`,
    violations,
  });

  if (!headingHit) return;

  if (requireContextForFirst) {
    const page = pageForHit(pages, headingHit);
    const linesBefore = page
      ? countMeaningfulBefore(page, headingHit.lineIndex)
      : 0;
    if (linesBefore < 2) {
      pushViolation(
        violations,
        "ACT_SIGNATURE_WITHOUT_CONTEXT",
        `Блок підписів перенесений без мінімум 2 рядків тексту: ${headingLabel}`,
        headingHit.pageNumber,
        { headingLabel, linesBeforeCount: linesBefore },
      );
    }
  }

  let cursor = globalLineIndex(headingHit);
  for (let index = 0; index < people.length; index++) {
    const result = validatePersonBlock({
      pages,
      person: people[index],
      afterGlobalIndex: cursor,
      label: `${headingLabel} №${index + 1}`,
      violations,
    });
    cursor = Math.max(cursor, result.nextGlobalIndex);
  }
};

const validateTotals = (pages, markers, violations) => {
  const subtotalHits = findOccurrences(pages, "Разом за номенклатурою");
  const expectedSubtotalCount = Math.max(
    0,
    Number(markers.expectedServiceSubtotalCount) || 0,
  );

  if (subtotalHits.length < expectedSubtotalCount) {
    pushViolation(
      violations,
      "ACT_SERVICE_TOTALS_MISSING",
      "У таблиці Акта відсутні підсумки за однією або кількома номенклатурами",
      null,
      { expectedSubtotalCount, actualSubtotalCount: subtotalHits.length },
    );
  }

  for (const hit of subtotalHits) {
    const page = pageForHit(pages, hit);
    if (!page) continue;
    if (
      countMeaningfulAfter(page, hit.lineEndIndex ?? hit.lineIndex) < 1
    ) {
      pushViolation(
        violations,
        "ACT_TOTALS_BLOCK_SPLIT",
        "Рядок 'Разом за номенклатурою' відірваний від наступного підсумку",
        page.pageNumber,
      );
    }
  }

  const grandTotalHits = findOccurrences(pages, "Усього:");
  if (!grandTotalHits.length) {
    pushViolation(
      violations,
      "ACT_GRAND_TOTAL_MISSING",
      "У таблиці Акта не знайдено рядок 'Усього:'",
      null,
    );
    return;
  }

  for (const hit of grandTotalHits) {
    const page = pageForHit(pages, hit);
    if (!page) continue;

    if (countMeaningfulBefore(page, hit.lineIndex) < 1) {
      pushViolation(
        violations,
        "ACT_TOTALS_BLOCK_SPLIT",
        "Рядок 'Усього:' перенесений без попереднього підсумкового рядка",
        page.pageNumber,
      );
    }

    const nearbyText = page.lines
      .slice(Math.max(0, hit.lineIndex - 1), hit.lineIndex + 2)
      .map((line) => normalizeComparable(line.text))
      .join(" ");
    if (!nearbyText.includes(normalizeComparable("Разом"))) {
      pushViolation(
        violations,
        "ACT_GRAND_TOTAL_SPLIT",
        "Комірка 'Разом' відірвана від рядка 'Усього:'",
        page.pageNumber,
      );
    }
  }
};

const validateCopiesBlock = (pages, markers, violations) => {
  validateRequiredBlock({
    pages,
    marker: "Акт складено у",
    missingCode: "ACT_COPIES_HEADING_MISSING",
    hangingCode: "ACT_COPIES_BLOCK_HANGING",
    missingMessage: "Не знайдено блок про примірники Акта",
    hangingMessage: "Заголовок блоку примірників залишився без переліку",
    violations,
  });

  const expectedCopiesCount = Math.max(
    0,
    Number(markers.expectedCopiesCount) || 0,
  );
  if (!expectedCopiesCount) return;

  const copyLines = findOccurrences(pages, "примірник №");
  if (copyLines.length < expectedCopiesCount) {
    pushViolation(
      violations,
      "ACT_COPIES_MISSING",
      "Кількість надрукованих рядків примірників менша за очікувану",
      null,
      { expectedCopiesCount, actualCopiesCount: copyLines.length },
    );
  }
};

const validateCommanderSection = (pages, markers, violations) => {
  const heading = "ІІІ. Висновок командира військової частини:";
  const hits = findOccurrences(pages, heading);

  if (!markers.showCommanderConclusion) {
    if (hits.length) {
      pushViolation(
        violations,
        "ACT_COMMANDER_SECTION_UNEXPECTED",
        "Розділ III надруковано, хоча умовний блок мав бути прихований",
        hits[0].pageNumber,
      );
    }
    return;
  }

  const headingHit = validateRequiredBlock({
    pages,
    marker: heading,
    missingCode: "ACT_COMMANDER_SECTION_MISSING",
    hangingCode: "ACT_COMMANDER_HEADING_HANGING",
    missingMessage: "Не знайдено розділ III — висновок командира",
    hangingMessage: "Заголовок розділу III залишився без тексту висновку",
    violations,
  });

  if (!headingHit) return;

  validatePersonBlock({
    pages,
    person: markers.commander || {},
    afterGlobalIndex: globalLineIndex(headingHit),
    label: "командир військової частини",
    violations,
    requireContext: true,
  });
};

const validateSectionOrder = (pages, markers, violations) => {
  const orderedMarkers = [
    "І. Опис події:",
    "ІІ. Висновок комісії:",
    "Голова комісії:",
    "Члени комісії:",
    "Учасники (свідки) події:",
    "Начальники служб забезпечення:",
    "Акт складено у",
    ...(markers.showCommanderConclusion
      ? ["ІІІ. Висновок командира військової частини:"]
      : []),
  ];

  const hits = orderedMarkers
    .map((marker) => ({ marker, hit: firstOccurrence(pages, marker) }))
    .filter((entry) => entry.hit);

  for (let index = 1; index < hits.length; index++) {
    if (globalLineIndex(hits[index].hit) > globalLineIndex(hits[index - 1].hit)) {
      continue;
    }
    pushViolation(
      violations,
      "ACT_SECTION_ORDER_INVALID",
      "Порушено порядок розділів або підписних блоків Акта",
      hits[index].hit.pageNumber,
      { previousMarker: hits[index - 1].marker, marker: hits[index].marker },
    );
  }
};

const validateActLayoutRules = (pages, context = {}, violations) => {
  const markers = context.markers || {};

  validateEmptyIntermediatePages(pages, violations);
  validateApprovalSealSpacing(pages, violations);
  validateNarrativeSpacing(pages, violations);

  validateRequiredBlock({
    pages,
    marker: "І. Опис події:",
    missingCode: "ACT_EVENT_SECTION_MISSING",
    hangingCode: "ACT_EVENT_HEADING_HANGING",
    missingMessage: "Не знайдено розділ I — опис події",
    hangingMessage:
      "Після заголовка 'І. Опис події:' немає мінімум 2 рядків тексту",
    violations,
    minLinesAfter: 2,
  });

  validateRequiredBlock({
    pages,
    marker: "ІІ. Висновок комісії:",
    missingCode: "ACT_COMMISSION_SECTION_MISSING",
    hangingCode: "ACT_COMMISSION_HEADING_HANGING",
    missingMessage: "Не знайдено розділ II — висновок комісії",
    hangingMessage: "Заголовок 'ІІ. Висновок комісії:' залишився без тексту",
    violations,
  });

  validateTotals(pages, markers, violations);

  validatePeopleSection({
    pages,
    heading: "Голова комісії:",
    headingLabel: "голова комісії",
    people: markers.chairman ? [markers.chairman] : [],
    violations,
    requireContextForFirst: true,
  });

  validatePeopleSection({
    pages,
    heading: "Члени комісії:",
    headingLabel: "член комісії",
    people: markers.commissionMembers || [],
    violations,
  });

  validatePeopleSection({
    pages,
    heading: "Учасники (свідки) події:",
    headingLabel: "учасник (свідок) події",
    people: markers.eventWitnesses || [],
    violations,
  });

  validatePeopleSection({
    pages,
    heading: "Начальники служб забезпечення:",
    headingLabel: "начальник служби забезпечення",
    people: markers.supplyServiceChiefs || [],
    violations,
  });

  validateCopiesBlock(pages, markers, violations);
  validateCommanderSection(pages, markers, violations);
  validateSectionOrder(pages, markers, violations);
};

module.exports = validateActLayoutRules;
