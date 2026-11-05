import mongoose from 'mongoose';
import Category from '../models/Category.model.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeName = (value) => typeof value === 'string' ? value.trim() : '';

export const listCategories = (userId, type) => {
  const query = { userId, active: true };
  if (type === 'Credit' || type === 'Debit') query.type = type;
  return Category.find(query).sort({ type: 1, name: 1 }).lean();
};

export const getCategory = async (userId, categoryId) => {
  if (!isValidId(categoryId)) return null;
  return Category.findOne({ _id: categoryId, userId }).lean();
};

export const createCategory = async (userId, data) => {
  const name = normalizeName(data.name);
  if (!name || !['Credit', 'Debit'].includes(data.type)) {
    const error = new Error('Category name and valid transaction type are required'); error.status = 400; throw error;
  }
  try {
    return await Category.create({ userId, name, type: data.type, description: normalizeName(data.description), icon: data.icon || null, color: data.color || null });
  } catch (error) {
    if (error.code === 11000) { error.status = 409; error.message = 'A category with this name and type already exists'; }
    throw error;
  }
};

export const updateCategory = async (userId, categoryId, data) => {
  const category = await Category.findOne({ _id: categoryId, userId });
  if (!category) return null;
  if (data.type && data.type !== category.type) { const error = new Error('Category transaction type cannot be changed'); error.status = 400; throw error; }
  if (data.name !== undefined) category.name = normalizeName(data.name);
  if (data.description !== undefined) category.description = normalizeName(data.description);
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.color !== undefined) category.color = data.color;
  try { return await category.save(); } catch (error) {
    if (error.code === 11000) { error.status = 409; error.message = 'A category with this name and type already exists'; }
    throw error;
  }
};

export const deactivateCategory = async (userId, categoryId) => {
  return Category.findOneAndUpdate({ _id: categoryId, userId }, { active: false, 'subcategories.$[].active': false }, { new: true });
};

export const addSubcategory = async (userId, categoryId, data) => {
  const category = await Category.findOne({ _id: categoryId, userId, active: true });
  if (!category) return null;
  const name = normalizeName(data.name);
  if (!name) { const error = new Error('Subcategory name is required'); error.status = 400; throw error; }
  if (category.subcategories.some(item => item.active && item.name.toLowerCase() === name.toLowerCase())) {
    const error = new Error('A subcategory with this name already exists'); error.status = 409; throw error;
  }
  category.subcategories.push({ name });
  await category.save();
  return category;
};

export const updateSubcategory = async (userId, categoryId, subCategoryId, data) => {
  const category = await Category.findOne({ _id: categoryId, userId, active: true });
  if (!category) return null;
  const subcategory = category.subcategories.id(subCategoryId);
  if (!subcategory || !subcategory.active) return null;
  const name = normalizeName(data.name);
  if (!name) { const error = new Error('Subcategory name is required'); error.status = 400; throw error; }
  if (category.subcategories.some(item => item._id.toString() !== subCategoryId && item.active && item.name.toLowerCase() === name.toLowerCase())) {
    const error = new Error('A subcategory with this name already exists'); error.status = 409; throw error;
  }
  subcategory.name = name;
  await category.save();
  return category;
};

export const deactivateSubcategory = async (userId, categoryId, subCategoryId) => {
  const category = await Category.findOne({ _id: categoryId, userId, active: true });
  if (!category) return null;
  const subcategory = category.subcategories.id(subCategoryId);
  if (!subcategory) return null;
  subcategory.active = false;
  await category.save();
  return category;
};

export const validateTransactionCategory = async (userId, { categoryId, subCategoryId, type }) => {
  if (!categoryId) return { category: null, subcategory: null };
  if (!isValidId(categoryId)) { const error = new Error('Invalid category'); error.status = 400; throw error; }
  const category = await Category.findOne({ _id: categoryId, userId, active: true });
  if (!category) { const error = new Error('Category not found'); error.status = 404; throw error; }
  if (category.type !== type) { const error = new Error('Category type does not match transaction type'); error.status = 400; throw error; }
  let subcategory = null;
  if (subCategoryId) {
    subcategory = category.subcategories.id(subCategoryId);
    if (!subcategory || !subcategory.active) { const error = new Error('Subcategory not found'); error.status = 404; throw error; }
  }
  return { category, subcategory };
};
