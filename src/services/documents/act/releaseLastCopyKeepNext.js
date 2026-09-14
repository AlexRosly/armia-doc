// Run only after Docxtemplater has expanded the copies loop.
// Keep the template and every other paragraph byte-for-byte unchanged.
const textOf = (xml) =>
  [...xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
    .map((match) => match[1])
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const releaseLastCopyKeepNext = (xml, copiesCount) => {
  if (!Number.isInteger(copiesCount) || copiesCount < 1) return xml;

  const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)];
  const headings = paragraphs.filter((p) =>
    /^Акт складено у \d+ примірниках\s*:$/u.test(textOf(p[0])),
  );
  // Do not guess if the expected block is absent or ambiguous.
  if (headings.length !== 1) return xml;

  let previous = headings[0];
  const start = paragraphs.indexOf(previous) + 1;
  const copies = [];
  for (let i = start; i < paragraphs.length; i += 1) {
    const p = paragraphs[i];
    if (xml.slice(previous.index + previous[0].length, p.index).trim()) break;
    if (!/^примірник №\s*\d+\s*[–—-]/u.test(textOf(p[0]))) break;
    copies.push(p);
    previous = p;
  }
  if (copies.length !== copiesCount) return xml;

  const last = copies[copies.length - 1];
  const opening = last[0].match(/^<w:p\b[^>]*>/)[0];
  const tail = last[0].slice(opening.length);
  const properties = tail.match(/^\s*<w:pPr\b[^>]*(?:\/>|>[\s\S]*?<\/w:pPr>)/);
  const off = '<w:keepNext w:val="0"/>';
  let updated;
  if (!properties) {
    updated = `${opening}<w:pPr>${off}</w:pPr>${tail}`;
  } else {
    let pPr = properties[0];
    // Leave historical properties in pPrChange untouched.
    const historyIndex = pPr.indexOf("<w:pPrChange");
    const live = historyIndex < 0 ? pPr : pPr.slice(0, historyIndex);
    const history = historyIndex < 0 ? "" : pPr.slice(historyIndex);
    pPr = live.replace(/<w:keepNext\b[^>]*(?:\/>|>[\s\S]*?<\/w:keepNext>)/g, "") + history;
    pPr = pPr.replace(/<w:pPr\b([^>]*?)\/>/, "<w:pPr$1></w:pPr>");
    // keepNext follows pStyle in the paragraph property sequence.
    pPr = pPr.replace(/(<w:pPr\b[^>]*>)(\s*<w:pStyle\b[^>]*\/>\s*)?/, `$1$2${off}`);
    updated = opening + pPr + tail.slice(properties[0].length);
  }
  return xml.slice(0, last.index) + updated + xml.slice(last.index + last[0].length);
};

module.exports = releaseLastCopyKeepNext;
