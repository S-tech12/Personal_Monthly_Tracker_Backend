import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import * as categoryController from '../controllers/category.controller.js';

const router = express.Router();
router.use(protect);
router.get('/', categoryController.list);
router.post('/', categoryController.create);
router.get('/:categoryId', categoryController.get);
router.patch('/:categoryId', categoryController.update);
router.delete('/:categoryId', categoryController.remove);
router.post('/:categoryId/subcategories', categoryController.addSubcategory);
router.patch('/:categoryId/subcategories/:subCategoryId', categoryController.updateSubcategory);
router.delete('/:categoryId/subcategories/:subCategoryId', categoryController.removeSubcategory);
export default router;
