const prisma = require('../config/database');
const AppError = require('./AppError');
const {
  buildPagination,
  buildPaginatedResponse,
  buildSort,
  buildSearchFilter,
} = require('./pagination');

const createCrudService = (model, options = {}) => {
  const {
    searchFields = ['name'],
    defaultSort = 'createdAt',
    include = {},
    uniqueField = 'name',
  } = options;

  const modelClient = prisma[model];

  return {
    async getAll(query = {}) {
      const { page, limit, sortBy, sortOrder, search, ...filters } = query;
      const pagination = buildPagination(page, limit);
      const where = {
        ...buildSearchFilter(search, searchFields),
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
        ),
      };

      const [data, total] = await Promise.all([
        modelClient.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: buildSort(sortBy || defaultSort, sortOrder),
          include,
        }),
        modelClient.count({ where }),
      ]);

      return buildPaginatedResponse(data, total, pagination.page, pagination.limit);
    },

    async getById(id) {
      const item = await modelClient.findUnique({ where: { id }, include });
      if (!item) throw new AppError(`${model} not found`, 404);
      return item;
    },

    async create(data) {
      if (uniqueField && data[uniqueField]) {
        const existing = await modelClient.findFirst({
          where: { [uniqueField]: data[uniqueField] },
        });
        if (existing) {
          throw new AppError(`${model} with this ${uniqueField} already exists`, 409);
        }
      }
      return modelClient.create({ data, include });
    },

    async update(id, data) {
      await this.getById(id);
      if (uniqueField && data[uniqueField]) {
        const existing = await modelClient.findFirst({
          where: { [uniqueField]: data[uniqueField], NOT: { id } },
        });
        if (existing) {
          throw new AppError(`${model} with this ${uniqueField} already exists`, 409);
        }
      }
      return modelClient.update({ where: { id }, data, include });
    },

    async remove(id) {
      await this.getById(id);
      return modelClient.delete({ where: { id } });
    },
  };
};

module.exports = { createCrudService };
