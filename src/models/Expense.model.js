import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR'
  },
  expenseDateTime: {
    type: Date,
    required: [true, 'Expense date and time is required'],
    default: Date.now
  },
  description: {
    type: String
  },
  source: {
    type: String,
    enum: {
      values: ['voice', 'manual'],
      message: 'Invalid source'
    },
    default: 'voice'
  },
  type: {
    type: String,
    enum: ['Debit', 'Credit'],
    default: 'Debit'
  },
  person: { type: String, default: null },
  transactionDate: { type: String, default: null }
}, { timestamps: true });

// Compound index for optimizing queries filtering by user and date
expenseSchema.index({ userId: 1, expenseDateTime: -1 });

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export default Expense;
