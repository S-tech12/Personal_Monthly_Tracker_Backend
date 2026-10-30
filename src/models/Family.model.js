import mongoose from 'mongoose';

const familySchema = new mongoose.Schema({
  headId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Head ID is required']
  }
}, { timestamps: true });

const Family = mongoose.models.Family || mongoose.model('Family', familySchema);
export default Family;
