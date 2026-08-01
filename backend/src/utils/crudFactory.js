const prisma = require('../config/database');
const AppError = require('./AppError');
const {
  buildPagination,
  buildPaginatedResponse,
  buildSort,
  buildSearchFilter,
} = require('./pagination');
const { tenantWhere } = require('../lib/tenant');

const createCrudService = (model, options = {}) => {
  const {
    searchFields = ['name'],
    defaultSort = 'createdAt',
    include = {},
    uniqueField = 'name',
    tenantScoped = true,
  } = options;

  const modelClient = prisma[model];

  return {
    async getAll(query = {}, restaurantId) {
      const { page, limit, sortBy, sortOrder, search, ...filters } = query;
      const pagination = buildPagination(page, limit);
      const scope = tenantScoped ? restaurantId : undefined;
      const where = tenantWhere({
        ...buildSearchFilter(search, searchFields),
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
        ),
      }, scope);

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

    async getById(id, restaurantId) {
      const scope = tenantScoped ? restaurantId : undefined;
      const item = await modelClient.findFirst({
        where: tenantWhere({ id }, scope),
        include,
      });
      if (!item) throw new AppError(`${model} not found`, 404);
      return item;
    },

    async create(data, restaurantId) {
      const scope = tenantScoped ? restaurantId : undefined;
      if (uniqueField && data[uniqueField]) {
        const existing = await modelClient.findFirst({
          where: tenantWhere({ [uniqueField]: data[uniqueField] }, scope),
        });
        if (existing) {
          throw new AppError(`${model} with this ${uniqueField} already exists`, 409);
        }
      }
      return modelClient.create({
        data: tenantScoped && scope ? { ...data, restaurantId: scope } : data,
        include,
      });
    },

    async update(id, data, restaurantId) {
      await this.getById(id, restaurantId);
      const scope = tenantScoped ? restaurantId : undefined;
      if (uniqueField && data[uniqueField]) {
        const existing = await modelClient.findFirst({
          where: tenantWhere({ [uniqueField]: data[uniqueField], NOT: { id } }, scope),
        });
        if (existing) {
          throw new AppError(`${model} with this ${uniqueField} already exists`, 409);
        }
      }
      return modelClient.update({ where: { id }, data, include });
    },

    async remove(id, restaurantId) {
      await this.getById(id, restaurantId);
      return modelClient.delete({ where: { id } });
    },
  };
};

module.exports = { createCrudService };
