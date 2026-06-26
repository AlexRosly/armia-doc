// const calculateScore = (candidate) => {
//   const pages = candidate.pages;

//   const violations = pages.filter(
//     (page) => page.status !== "target" && page.status !== "last_page_allowed",
//   );

//   const totalDeviation = violations.reduce(
//     (sum, page) => sum + page.deviationCm,
//     0,
//   );

//   const maxDeviation = Math.max(
//     ...violations.map((page) => page.deviationCm),
//     0,
//   );

//   return {
//     violations: violations.length,

//     totalDeviation,

//     maxDeviation,
//   };
// };

// const bestEffortSelector = (results) => {
//   return results.sort((a, b) => {
//     const A = calculateScore(a);

//     const B = calculateScore(b);

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
  const pages = candidate.pages;

  const invalidPages = pages.filter(
    (page) => page.status !== "target" && page.status !== "last_page_allowed",
  );

  return {
    violations: invalidPages.length,

    totalDeviation: invalidPages.reduce(
      (sum, page) => sum + page.deviationCm,
      0,
    ),

    maxDeviation: Math.max(...invalidPages.map((page) => page.deviationCm), 0),
  };
};

const bestEffortSelector = (results) => {
  return results.sort((a, b) => {
    const A = getScore(a);

    const B = getScore(b);

    if (A.violations !== B.violations) {
      return A.violations - B.violations;
    }

    if (A.totalDeviation !== B.totalDeviation) {
      return A.totalDeviation - B.totalDeviation;
    }

    return A.maxDeviation - B.maxDeviation;
  })[0];
};
module.exports = bestEffortSelector;
