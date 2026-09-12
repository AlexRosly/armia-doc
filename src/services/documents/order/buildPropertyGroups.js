const { buildPropertyText } = require("../shared");

const stripEndingPunctuation = (value = "") =>
  String(value)
    .replace(/[.;:,]+$/g, "")
    .trim();
const normalizeCostLabel = (value = "") => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.includes("|") ? raw.split("|")[0].trim() : raw;
};

const formatCostAmount = (sum, currency = "") => {
  if (sum === null || sum === undefined || sum === "") return "";

  const raw = String(sum).trim().replace(",", ".");
  const numeric = Number(raw);

  if (Number.isNaN(numeric)) {
    return `${String(sum).trim()} ${currency}`.trim();
  }

  return `${numeric} ${currency}`.trim();
};

const buildOrderPropertyCostText = (property = {}) => {
  const cost = property?.cost;

  if (!cost || typeof cost !== "object") {
    return "";
  }

  const label = normalizeCostLabel(cost?.value);
  const amount = formatCostAmount(cost?.sum, cost?.currency);

  if (label && amount) return `${label} — ${amount}`;
  if (amount) return amount;
  if (label) return label;

  return "";
};

const buildOrderPropertyText = (property = {}) => {
  const baseText = stripEndingPunctuation(buildPropertyText(property));
  const costText = buildOrderPropertyCostText(property);

  if (!costText) {
    return baseText;
  }

  return `${baseText}, ${costText}`;
};

const buildPropertyGroups = (lostProperty = []) => {
  const services = Array.isArray(lostProperty) ? lostProperty : [];

  const totalItemsCount = services.reduce((total, service) => {
    const subDivisions = Array.isArray(service?.subDivisions)
      ? service.subDivisions
      : [];

    return (
      total +
      subDivisions.reduce((subTotal, subDivision) => {
        const listOfProperty = Array.isArray(subDivision?.listOfProperty)
          ? subDivision.listOfProperty
          : [];

        return subTotal + listOfProperty.length;
      }, 0)
    );
  }, 0);

  let globalItemIndex = 0;

  return services.map((service) => {
    const subDivisions = Array.isArray(service?.subDivisions)
      ? service.subDivisions
      : [];

    return {
      service: service?.service || "",
      subDivisions: subDivisions.map((subDivision) => {
        const listOfProperty = Array.isArray(subDivision?.listOfProperty)
          ? subDivision.listOfProperty
          : [];

        return {
          subDivision: subDivision?.subDivision || "",
          items: listOfProperty.map((property) => {
            globalItemIndex += 1;

            const baseText = buildOrderPropertyText(property);
            const ending = globalItemIndex === totalItemsCount ? "." : ";";
            const text = `${baseText}${ending}`;

            return {
              // text: `${baseText}${ending}`,
              text,
            };
          }),
        };
      }),
    };
  });
};

module.exports = buildPropertyGroups;
