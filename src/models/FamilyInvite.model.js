import mongoose from 'mongoose';

const familyInviteSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: [true, 'Family ID is required']
  },
  invitedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Inviting user ID is required']
  },
  invitedEmail: {
    type: String,
    required: [true, 'Invited email is required'],
    lowercase: true,
    trim: true
  },
  invitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Invited user ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compound index for querying a user's pending invites to a family
familyInviteSchema.index({ familyId: 1, invitedUserId: 1 });

const FamilyInvite = mongoose.models.FamilyInvite || mongoose.model('FamilyInvite', familyInviteSchema);
export default FamilyInvite;
