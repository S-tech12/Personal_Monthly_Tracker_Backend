import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  type: { type: String, enum: ['Credit', 'Debit'], default: 'Debit' },
  month: { type: Number, min: 1, max: 12, default: null },
  year: { type: Number, min: 2000, default: null },
  monthlyLimit: {
    type: Number,
    required: [true, 'Monthly limit is required'],
    min: [0, 'Monthly limit cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR'
  }
}, { timestamps: true });

// Compound unique index so a user can't have duplicate budgets for the same category
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });
budgetSchema.index({ userId: 1, categoryId: 1, month: 1, year: 1 }, { unique: true, sparse: true });

const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);
export default Budget;
