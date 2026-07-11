const {
  APPROVAL_AREA_LINE_SPACING,
  DOCUMENT_TITLE_SPACING_BEFORE_PT,
  MAIN_TEXT_PT,
  MAIN_LINE_SPACING,
  TABLE_TEXT_PT,
  VERTICAL_SPACING_BEFORE_PT,
} = require("./actParamSpace");

function* iterateActProfiles(layoutProfile) {
  for (const approvalAreaLineSpacing of APPROVAL_AREA_LINE_SPACING) {
    for (const documentTitleSpacingBeforePt of DOCUMENT_TITLE_SPACING_BEFORE_PT) {
      for (const verticalSpacingBeforePt of VERTICAL_SPACING_BEFORE_PT) {
        for (const mainTextPt of MAIN_TEXT_PT) {
          for (const mainLineSpacing of MAIN_LINE_SPACING) {
            for (const tableTextPt of TABLE_TEXT_PT) {
              yield {
                name: [
                  layoutProfile,
                  `approval_${approvalAreaLineSpacing}`,
                  `title_${documentTitleSpacingBeforePt}`,
                  `vertical_${verticalSpacingBeforePt}`,
                  `mainPt_${mainTextPt}`,
                  `mainLs_${mainLineSpacing}`,
                  `tablePt_${tableTextPt}`,
                ].join("__"),

                layoutProfile,
                approvalAreaLineSpacing,
                documentTitleSpacingBeforePt,
                verticalSpacingBeforePt,

                mainTextPt,
                signatureBlockPt: mainTextPt,
                mainLineSpacing,

                tableTextPt,
                tableLineSpacing: 1.0,

                staticHeaderPt: 10,
                signatureHintPt: 9,

                summaryTableKeepTogether: true,
                signatureBlockKeepTogether: true,
                headingsKeepWithNext: true,
                bodyTextCanBreak: true,
              };
            }
          }
        }
      }
    }
  }
}

module.exports = iterateActProfiles;
