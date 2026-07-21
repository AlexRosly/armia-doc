const getBlankPageCount = (orderPageCount) => Math.max(orderPageCount - 1, 0);

const getPhysicalPageCount = (orderPageCount) =>
  orderPageCount + getBlankPageCount(orderPageCount) + 1;

module.exports = {
  getBlankPageCount,
  getPhysicalPageCount,
};
