const test = require("node:test");
const assert = require("node:assert/strict");

const validateActLayoutRules = require("../src/services/layout/validators/act");
const {
  validateBottomMargins,
} = require("../src/services/layout/validators/common");
const {
  ACT_DOCX_GEOMETRY,
  compareSectionGeometry,
} = require("../src/services/layout/validateActDocxGeometry");

const page = (pageNumber, lines, isLastPage = false) => ({
  pageNumber,
  isLastPage,
  lines: lines.map((text, index) => ({
    index,
    text,
    y: 800 - index * 14,
    bottomY: 798 - index * 14,
  })),
});

const person = (firstName, lastName, position, rank) => ({
  firstName,
  lastName,
  fullName: `${firstName} ${lastName}`,
  position,
  rank,
});

const baseMarkers = () => ({
  expectedServiceSubtotalCount: 1,
  expectedCopiesCount: 1,
  showCommanderConclusion: true,
  chairman: person("Іван", "ПЕТРЕНКО", "Голова комісії — начальник служби", "майор"),
  commissionMembers: [
    person("Петро", "ІВАНЕНКО", "Член комісії — офіцер", "капітан"),
  ],
  eventWitnesses: [
    person("Олег", "СИДОРЕНКО", "Свідок події", "сержант"),
  ],
  supplyServiceChiefs: [
    person("Анна", "КОВАЛЬ", "Начальник служби забезпечення", "лейтенант"),
  ],
  commander: person(
    "Микола",
    "ШЕВЧЕНКО",
    "Командир військової частини",
    "полковник",
  ),
});

const validLines = () => [
  "Майно за номенклатурою служби",
  "1 Майно 123 шт 1 100,00 80,00 80,00",
  "Разом за номенклатурою служби 80,00",
  "Усього: 1 найменування Разом 80,00",
  "І. Опис події:",
  "Опис події займає щонайменше один рядок",
  "Подію підтверджено матеріалами справи",
  "ІІ. Висновок комісії:",
  "Комісія дійшла висновку про списання майна",
  "Додатковий рядок висновку комісії",
  "Голова комісії:",
  "Голова комісії — начальник служби",
  "майор Іван ПЕТРЕНКО",
  "(посада, військове звання, підпис, Власне ім’я, ПРІЗВИЩЕ)",
  "Члени комісії:",
  "Член комісії — офіцер",
  "капітан Петро ІВАНЕНКО",
  "(посада, військове звання, підпис, Власне ім’я, ПРІЗВИЩЕ)",
  "Учасники (свідки) події:",
  "Свідок події",
  "сержант Олег СИДОРЕНКО",
  "(посада, військове звання, підпис, Власне ім’я, ПРІЗВИЩЕ)",
  "Начальники служб забезпечення:",
  "Начальник служби забезпечення",
  "лейтенант Анна КОВАЛЬ",
  "(посада, військове звання, підпис, Власне ім’я, ПРІЗВИЩЕ)",
  "Акт складено у 2 примірниках:",
  "примірник №1 — військова частина",
  "ІІІ. Висновок командира військової частини:",
  "Вважаю списання майна обґрунтованим",
  "Командир військової частини",
  "полковник Микола ШЕВЧЕНКО",
  "(посада, військове звання, підпис, Власне ім’я, ПРІЗВИЩЕ)",
  "М. П.",
];

const validate = (pages, markers = baseMarkers()) => {
  const violations = [];
  validateActLayoutRules(pages, { markers }, violations);
  return violations;
};

test("fully valid Act passes every hard layout rule", () => {
  const violations = validate([page(1, validLines(), true)]);
  assert.deepEqual(violations, []);
});

test("event heading cannot remain at the bottom without event text", () => {
  const first = validLines().slice(0, 4).concat("І. Опис події:");
  const second = validLines().slice(5);
  const violations = validate([page(1, first), page(2, second, true)]);

  assert.ok(
    violations.some((item) => item.code === "ACT_EVENT_HEADING_HANGING"),
  );
});

test("subtotal and grand total cannot be split across pages", () => {
  const first = [
    "Майно за номенклатурою служби",
    "1 Майно 123 шт 1 100,00 80,00 80,00",
    "Разом за номенклатурою служби 80,00",
  ];
  const second = validLines().slice(3);
  const violations = validate([page(1, first), page(2, second, true)]);

  assert.ok(
    violations.some((item) => item.code === "ACT_TOTALS_BLOCK_SPLIT"),
  );
});

test("chairman signature section requires two context lines on its page", () => {
  const lines = validLines();
  const chairmanIndex = lines.indexOf("Голова комісії:");
  const first = lines.slice(0, chairmanIndex);
  const second = lines.slice(chairmanIndex);
  const violations = validate([page(1, first), page(2, second, true)]);

  assert.ok(
    violations.some(
      (item) => item.code === "ACT_SIGNATURE_WITHOUT_CONTEXT",
    ),
  );
});

test("position on one page and signer name on the next is a split block", () => {
  const lines = validLines();
  const chairmanPositionIndex = lines.indexOf(
    "Голова комісії — начальник служби",
  );
  const first = lines.slice(0, chairmanPositionIndex + 1);
  const second = lines.slice(chairmanPositionIndex + 1);
  const violations = validate([page(1, first), page(2, second, true)]);

  assert.ok(
    violations.some((item) => item.code === "ACT_SIGNATURE_BLOCK_SPLIT"),
  );
});

test("commander section is forbidden when the conditional block is off", () => {
  const markers = baseMarkers();
  markers.showCommanderConclusion = false;
  markers.commander = {};
  const violations = validate([page(1, validLines(), true)], markers);

  assert.ok(
    violations.some(
      (item) => item.code === "ACT_COMMANDER_SECTION_UNEXPECTED",
    ),
  );
});

test("Act bottom validation accepts 0.9–1.1 cm and allows a larger last page", () => {
  const pages = [
    { pageNumber: 1, isLastPage: false, actualBottomTextGapCm: 0.9 },
    { pageNumber: 2, isLastPage: false, actualBottomTextGapCm: 1.1 },
    { pageNumber: 3, isLastPage: true, actualBottomTextGapCm: 12.0 },
  ];

  const violations = validateBottomMargins(pages, {
    minAllowedBottomMarginCm: 0.9,
    maxAllowedBottomMarginCm: 1.1,
    metricField: "actualBottomTextGapCm",
  });

  assert.deepEqual(violations, []);
});

test("Act bottom validation rejects both unsafe and underfilled full pages", () => {
  const pages = [
    { pageNumber: 1, isLastPage: false, actualBottomTextGapCm: 0.89 },
    { pageNumber: 2, isLastPage: false, actualBottomTextGapCm: 1.11 },
    { pageNumber: 3, isLastPage: true, actualBottomTextGapCm: 4.0 },
  ];

  const violations = validateBottomMargins(pages, {
    minAllowedBottomMarginCm: 0.9,
    maxAllowedBottomMarginCm: 1.1,
    metricField: "actualBottomTextGapCm",
  });

  assert.deepEqual(
    violations.map((item) => item.status),
    ["below_min", "above_max"],
  );
});

test("V1 and V2 DOCX geometry contracts match the reference templates", () => {
  for (const layoutProfile of [
    "ACT_LANDSCAPE_V1",
    "ACT_LANDSCAPE_V2",
  ]) {
    const expected = ACT_DOCX_GEOMETRY[layoutProfile];
    const section = {
      index: 0,
      page: {
        widthTwips: String(expected.page.widthTwips),
        heightTwips: String(expected.page.heightTwips),
        orientation: expected.page.orientation,
      },
      margins: Object.fromEntries(
        Object.entries(expected.margins).map(([side, value]) => [
          side,
          String(value),
        ]),
      ),
    };

    assert.deepEqual(compareSectionGeometry([section], layoutProfile), []);
  }
});

test("DOCX geometry mismatch is a hard Act violation", () => {
  const violations = compareSectionGeometry(
    [
      {
        index: 0,
        page: {
          widthTwips: "16838",
          heightTwips: "11906",
          orientation: "portrait",
        },
        margins: {
          top: "1701",
          right: "567",
          bottom: "567",
          left: "567",
        },
      },
    ],
    "ACT_LANDSCAPE_V1",
  );

  assert.ok(
    violations.some(
      (item) => item.code === "ACT_DOCX_ORIENTATION_MISMATCH",
    ),
  );
  assert.ok(
    violations.some(
      (item) =>
        item.code === "ACT_DOCX_MARGIN_MISMATCH" && item.side === "top",
    ),
  );
  assert.ok(
    violations.some(
      (item) =>
        item.code === "ACT_DOCX_MARGIN_MISMATCH" && item.side === "left",
    ),
  );
});
