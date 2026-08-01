const createCrudController = (service) => ({
  getAll: async (req, res) => {
    const result = await service.getAll(req.query, req.restaurantId);
    res.json({ success: true, ...result });
  },
  getById: async (req, res) => {
    const item = await service.getById(req.params.id, req.restaurantId);
    res.json({ success: true, data: item });
  },
  create: async (req, res) => {
    const item = await service.create(req.body, req.restaurantId);
    res.status(201).json({ success: true, data: item });
  },
  update: async (req, res) => {
    const item = await service.update(req.params.id, req.body, req.restaurantId);
    res.json({ success: true, data: item });
  },
  delete: async (req, res) => {
    await service.remove(req.params.id, req.restaurantId);
    res.json({ success: true, message: 'Deleted successfully' });
  },
});

module.exports = { createCrudController };
