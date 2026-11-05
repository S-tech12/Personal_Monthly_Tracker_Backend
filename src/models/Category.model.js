import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Credit', 'Debit'], required: true },
  description: { type: String, trim: true, default: '' },
  icon: { type: String, default: null },
  color: { type: String, default: null },
  active: { type: Boolean, default: true },
  subcategories: { type: [subCategorySchema], default: [] }
}, { timestamps: true });

categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
