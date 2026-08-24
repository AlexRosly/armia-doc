// const buildGenerationJobPayload = (job) => ({
//   jobId: String(job._id),
//   status: job.status,
//   mode: job.mode,
//   error: job.error,
//   layoutCheck: job.layoutCheck,
//   expiresAt: job.expiresAt,
//   downloads: {
//     ...(job.files?.docx && {
//       docx: `/api/generation/${job._id}/download/docx`,
//     }),
//     ...(job.files?.pdf && {
//       pdf: `/api/generation/${job._id}/download/pdf`,
//     }),
//     ...(job.files?.armdoc && {
//       armdoc: `/api/generation/${job._id}/download/armdoc`,
//     }),
//   },
// });

// module.exports = buildGenerationJobPayload;
// const hasKeys = (value) =>
//   value &&
//   typeof value === "object" &&
//   !Array.isArray(value) &&
//   Object.keys(value).length > 0;

// const buildDownloadsPayload = (job) => {
//   const downloads = {};

//   if (job.files?.docx) {
//     downloads.docx = `/api/generation/${job._id}/download/docx`;
//   }

//   if (job.files?.pdf) {
//     downloads.pdf = `/api/generation/${job._id}/download/pdf`;
//   }

//   if (job.files?.armdoc) {
//     downloads.armdoc = `/api/generation/${job._id}/download/armdoc`;
//   }

//   return downloads;
// };

// const buildLayoutCheckPayload = (job) => {
//   if (!job.layoutCheck) return undefined;

//   const layoutCheck = {
//     status: job.layoutCheck.status,
//   };

//   if (job.layoutCheck.profile) {
//     layoutCheck.profile = job.layoutCheck.profile;
//   }

//   if (job.layoutCheck.orderProfile) {
//     layoutCheck.orderProfile = job.layoutCheck.orderProfile;
//   }

//   if (job.layoutCheck.approvalProfile) {
//     layoutCheck.approvalProfile = job.layoutCheck.approvalProfile;
//   }

//   if (
//     job.layoutCheck.printSettings &&
//     job.layoutCheck.printSettings.printMode
//   ) {
//     layoutCheck.printSettings = {
//       printMode: job.layoutCheck.printSettings.printMode,
//     };
//   }

//   return hasKeys(layoutCheck) ? layoutCheck : undefined;
// };

// const buildGenerationJobPayload = (job) => {
//   const payload = {
//     jobId: String(job._id),
//     status: job.status,
//     mode: job.mode,
//     error: job.error,
//     expiresAt: job.expiresAt,
//   };

//   const layoutCheck = buildLayoutCheckPayload(job);
//   if (layoutCheck) {
//     payload.layoutCheck = layoutCheck;
//   }

//   const downloads = buildDownloadsPayload(job);
//   if (hasKeys(downloads)) {
//     payload.downloads = downloads;
//   }

//   return payload;
// };

// module.exports = buildGenerationJobPayload;
const hasKeys = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0;

const buildDownloadsPayload = (job) => {
  const downloads = {};

  if (job.files?.docx) {
    downloads.docx = `/api/generation/${job._id}/download/docx`;
  }

  if (job.files?.pdf) {
    downloads.pdf = `/api/generation/${job._id}/download/pdf`;
  }

  if (job.files?.armdoc) {
    downloads.armdoc = `/api/generation/${job._id}/download/armdoc`;
  }

  return downloads;
};

const buildLayoutCheckPayload = (job) => {
  if (!job.layoutCheck) return undefined;

  const layoutCheck = {};

  if (job.layoutCheck.status) {
    layoutCheck.status = job.layoutCheck.status;
  }

  if (job.layoutCheck.profile) {
    layoutCheck.profile = job.layoutCheck.profile;
  }

  if (job.layoutCheck.orderProfile) {
    layoutCheck.orderProfile = job.layoutCheck.orderProfile;
  }

  if (job.layoutCheck.approvalProfile) {
    layoutCheck.approvalProfile = job.layoutCheck.approvalProfile;
  }

  if (job.layoutCheck.printSettings?.printMode) {
    layoutCheck.printSettings = {
      printMode: job.layoutCheck.printSettings.printMode,
    };
  }

  return hasKeys(layoutCheck) ? layoutCheck : undefined;
};

const buildGenerationJobPayload = (job) => {
  const payload = {
    jobId: String(job._id),
    status: job.status,
    mode: job.mode,
    error: job.error,
    expiresAt: job.expiresAt,
  };

  const layoutCheck = buildLayoutCheckPayload(job);
  if (layoutCheck) {
    payload.layoutCheck = layoutCheck;
  }

  const downloads = buildDownloadsPayload(job);
  if (hasKeys(downloads)) {
    payload.downloads = downloads;
  }

  return payload;
};

module.exports = buildGenerationJobPayload;
