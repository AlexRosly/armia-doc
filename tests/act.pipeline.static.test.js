const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("Act generation uses the isolated Act validator", () => {
  const source = read("src/services/layout/runActGeneration.js");

  assert.match(source, /require\("\.\/validateActDocxGeometry"\)/);
  assert.match(source, /require\("\.\/validateActLayout"\)/);
  assert.match(source, /layout\.passed\s*=/);
  assert.match(source, /candidate\.marginViolations\.length === 0/);
  assert.match(source, /selected first fully valid profile/);
  assert.doesNotMatch(source, /best_effort/);
  assert.doesNotMatch(source, /require\("\.\/validateLayout"\)/);
});

test("validated DOCX and PDF are promoted without reconversion", () => {
  const source = read("src/services/layout/runActGeneration.js");

  assert.match(source, /fs\.rename\(candidate\.docxPath, finalDocxPath\)/);
  assert.match(source, /fs\.rename\(candidate\.pdfPath, finalPdfPath\)/);
  assert.doesNotMatch(source, /copyFile/);
  assert.doesNotMatch(source, /finalizeResult/);
});

test("Act search cannot be silently narrowed by a stale environment value", () => {
  const source = read("src/services/layout/runActGeneration.js");

  assert.match(source, /const maxCheckedProfiles = profiles\.length/);
  assert.doesNotMatch(source, /ACT_MAX_CHECKED_PROFILES/);
});

test("Act validator enforces the visible-text bottom range 0.9–1.1 cm", () => {
  const source = read("src/services/layout/validateActLayout.js");
  const geometrySource = read(
    "src/services/layout/validateActDocxGeometry.js",
  );

  assert.match(source, /minAllowedBottomMarginCm:\s*0\.9/);
  assert.match(source, /maxAllowedBottomMarginCm:\s*1\.1/);
  assert.match(source, /actualBottomTextGapCm/);
  assert.match(geometrySource, /ACT_LANDSCAPE_V1/);
  assert.match(geometrySource, /top:\s*567/);
  assert.match(geometrySource, /left:\s*1417/);
  assert.match(geometrySource, /ACT_LANDSCAPE_V2/);
  assert.match(geometrySource, /top:\s*1701/);
});

test("Act item rows receive their total residual value", () => {
  const buildPropertyGroups = require(
    "../src/services/documents/act/buildPropertyGroups",
  );
  const groups = buildPropertyGroups([
    {
      service: "Речова служба",
      totalResidualCostUah: "80,00",
      listOfProperty: [
        {
          itemName: "Майно",
          cost: {
            residualUnitCostUah: "80,00",
            grandTotalResidualCostUah: "160,00",
          },
        },
      ],
    },
  ]);

  assert.equal(groups[0].items[0].totalResidualCostUah, "160,00");
});

test("report and order dispatch remain separate from Act", () => {
  const source = read("src/services/generation/runGenerationJob.js");

  assert.match(source, /report\.documentType === "order"/);
  assert.match(source, /report\.documentType === "act"/);
  assert.match(source, /runOrderGeneration\(report, job\)/);
  assert.match(source, /runActGeneration\(report, job\)/);
  assert.match(source, /runProfiles\(report, job\)/);
});
