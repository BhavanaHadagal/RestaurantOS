const buildPagination = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  return { skip, take: limitNum, page: pageNum, limit: limitNum };
};

const buildPaginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

const buildSort = (sortBy = 'createdAt', sortOrder = 'desc') => ({
  [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
});

const buildSearchFilter = (search, fields) => {
  if (!search) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
};

module.exports = {
  buildPagination,
  buildPaginatedResponse,
  buildSort,
  buildSearchFilter,
};
