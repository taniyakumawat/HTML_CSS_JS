import { ApiError } from '../middleware/error.js';
import { sendSuccess } from './apiResponse.js';
import { getPagination, buildSearchFilter, paged } from './pagination.js';

/**
 * Creates a standard set of REST handlers (list/detail/create/update/remove)
 * for a Mongoose model, with pagination, search, filters and populate built in.
 *
 * @param {import('mongoose').Model} Model
 * @param {object} options
 * @param {string[]}   [options.searchFields]    fields matched by ?search=
 * @param {object|object[]} [options.populate]    populate config
 * @param {(req)=>object} [options.queryFilter]   extra filter from query string
 * @param {(req)=>Promise} [options.assertDeletable] throw ApiError(409) if in use
 * @param {(req)=>Promise<object>} [options.transformCreate] build the document body
 * @param {(req)=>Promise<object>} [options.transformUpdate]
 */
export const makeCrud = (Model, options = {}) => {
  const {
    searchFields = [],
    populate = [],
    queryFilter = () => ({}),
    assertDeletable = null,
    transformCreate = null,
    transformUpdate = null,
    name = Model.modelName,
  } = options;

  const list = async (req, res, next) => {
    try {
      const { page, limit, skip, search, sort } = getPagination(req);
      const filter = { ...buildSearchFilter(search, searchFields), ...queryFilter(req) };
      const [items, total] = await Promise.all([
        Model.find(filter).sort(sort).skip(skip).limit(limit).populate(populate),
        Model.countDocuments(filter),
      ]);
      sendSuccess(res, paged(items, page, limit, total));
    } catch (error) {
      next(error);
    }
  };

  const detail = async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id).populate(populate);
      if (!doc) throw new ApiError(404, `${name} not found`);
      sendSuccess(res, doc);
    } catch (error) {
      next(error);
    }
  };

  const create = async (req, res, next) => {
    try {
      const body = transformCreate ? await transformCreate(req) : req.body;
      const doc = await Model.create(body);
      const populated = await Model.findById(doc._id).populate(populate);
      sendSuccess(res, populated, `${name} created successfully`, 201);
    } catch (error) {
      next(error);
    }
  };

  const update = async (req, res, next) => {
    try {
      const body = transformUpdate ? await transformUpdate(req) : req.body;
      const doc = await Model.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
      }).populate(populate);
      if (!doc) throw new ApiError(404, `${name} not found`);
      sendSuccess(res, doc, `${name} updated successfully`);
    } catch (error) {
      next(error);
    }
  };

  const remove = async (req, res, next) => {
    try {
      if (assertDeletable) await assertDeletable(req);
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new ApiError(404, `${name} not found`);
      sendSuccess(res, { id: req.params.id }, `${name} deleted successfully`);
    } catch (error) {
      next(error);
    }
  };

  return { list, detail, create, update, remove };
};
