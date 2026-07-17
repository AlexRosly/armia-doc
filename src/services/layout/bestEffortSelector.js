// const getScore = (candidate) => {
//   const pages = candidate.pages;

//   const invalidPages = pages.filter(
//     (page) => page.status !== "target" && page.status !== "last_page_allowed",
//   );

//   return {
//     violations: invalidPages.length,

//     totalDeviation: invalidPages.reduce(
//       (sum, page) => sum + page.deviationCm,
//       0,
//     ),

//     maxDeviation: Math.max(...invalidPages.map((page) => page.deviationCm), 0),
//   };
// };

// const bestEffortSelector = (results) => {
//   return results.sort((a, b) => {
//     const A = getScore(a);

//     const B = getScore(b);

//     if (A.violations !== B.violations) {
//       return A.violations - B.violations;
//     }

//     if (A.totalDeviation !== B.totalDeviation) {
//       return A.totalDeviation - B.totalDeviation;
//     }

//     return A.maxDeviation - B.maxDeviation;
//   })[0];
// };
// module.exports = bestEffortSelector;
const getScore = (candidate) => {
  const marginPenalty = (candidate.marginViolations || []).reduce(
    (sum, page) => sum + (page.deviationCm || 0),
    0,
  );

  const hardPenalty = (candidate.hardViolations || []).length * 1000;

  return {
    hardViolationsCount: (candidate.hardViolations || []).length,
    marginViolationsCount: (candidate.marginViolations || []).length,
    totalPenalty: hardPenalty + marginPenalty,
    maxMarginDeviation: Math.max(
      ...(candidate.marginViolations || []).map(
        (page) => page.deviationCm || 0,
      ),
      0,
    ),
  };
};

const bestEffortSelector = (results = []) => {
  return results.slice().sort((a, b) => {
    const A = getScore(a);
    const B = getScore(b);

    if (A.hardViolationsCount !== B.hardViolationsCount) {
      return A.hardViolationsCount - B.hardViolationsCount;
    }

    if (A.marginViolationsCount !== B.marginViolationsCount) {
      return A.marginViolationsCount - B.marginViolationsCount;
    }

    if (A.totalPenalty !== B.totalPenalty) {
      return A.totalPenalty - B.totalPenalty;
    }

    return A.maxMarginDeviation - B.maxMarginDeviation;
  })[0];
};

module.exports = bestEffortSelector;
