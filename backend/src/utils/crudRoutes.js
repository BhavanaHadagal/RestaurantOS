const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize, bindTenant } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { createCrudController } = require('./crudController');

const createCrudRoutes = (router, config) => {
  const {
    controller,
    permission,
    createRules = [],
    updateRules = [],
    idParam = param('id').isUUID().withMessage('Valid ID required'),
  } = config;

  const viewPerm = `${permission}.view`;
  const createPerm = `${permission}.create`;
  const updatePerm = `${permission}.update`;
  const deletePerm = `${permission}.delete`;

  router.get(
    '/',
    authenticate,
    bindTenant,
    authorize(viewPerm),
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    validate,
    asyncHandler(controller.getAll)
  );

  router.get(
    '/:id',
    authenticate,
    bindTenant,
    authorize(viewPerm),
    [idParam],
    validate,
    asyncHandler(controller.getById)
  );

  router.post(
    '/',
    authenticate,
    bindTenant,
    authorize(createPerm),
    createRules,
    validate,
    asyncHandler(controller.create)
  );

  router.put(
    '/:id',
    authenticate,
    bindTenant,
    authorize(updatePerm),
    [idParam, ...updateRules],
    validate,
    asyncHandler(controller.update)
  );

  router.delete(
    '/:id',
    authenticate,
    bindTenant,
    authorize(deletePerm),
    [idParam],
    validate,
    asyncHandler(controller.delete)
  );

  return router;
};

module.exports = { createCrudRoutes, createCrudController };
