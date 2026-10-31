import User from '../models/user.model.js';
import Family from '../models/Family.model.js';
import FamilyInvite from '../models/FamilyInvite.model.js';
import { createNotification } from './notification.service.js';

export const familyService = {
  getVisibleUserIds: async (userId) => {
    
    // first we need to find the user document based on the loggedIn user Id 
    const user = await User.findById(userId);

    // and if user is not found or user is not part of any family then we need to return the id itself
    if (!user) return [userId];

    if (!user.familyId) {
      return [userId];
    }

    // and if user document found and there is familyId then we need to fetch the document who has exact this familyId and then we need to just select _id from that document and create the array of it 
    const familyUsers = await User.find({ familyId: user.familyId }).select('_id');

    // then we need to return the document with only id by running the map method over it.
    return familyUsers.map(u => u._id);
  },

  // it will check that the user is head or not?? but still there is confusion there because it handles the individual and family both can update the budget. so i have to work on it.
  isHeadUser: async (userId) => {

    // first it will find the user in User model
    const user = await User.findById(userId);
    if (!user) return true;


    // this is for the individual who has no family 
    if (!user.familyId) return true;

    // if it has familyId then it will go and check in the Family Model and fetch the document based on familyId which we found in the user model's document
    const family = await Family.findById(user.familyId);
    if (!family) return true;

    // and if the document found then we check headId of it and then compare it with the current id and if equals then it is head otherwise not.
    return family.headId.toString() === userId.toString();
  },


  // this is the function which send Invitation to the user.
  sendInvite: async (requesterId, recipientEmail) => {

    // first fetch the use document to whom we want to send invitation
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) {
      throw new Error('No Spendly account found with this email');
    }

    // if the document contains familyId already. then we are just throw new error 
    if (recipient.familyId) {
      throw new Error('This user is already part of a family group');
    }

    // then we are checking that the requesterId is their id or not ? because if it matches then we can't invite ourselves.
    if (recipient._id.toString() === requesterId.toString()) {
      throw new Error('You cannot invite yourself');
    }

    // now we are fetching the requester document from User database.
    const requester = await User.findById(requesterId);

    // then we are getting the familyId from that document
    let familyId = requester.familyId;


    // if we can't find the familyId then we are just creating new instance of the Family model and headId will be our requesterId and then just save it into the database.
    if (!familyId) {

      // create the new instance for the family database
      const newFamily = new Family({ headId: requesterId });
      
      // save it first
      await newFamily.save();
      
      // update the requester (father) document by adding the family id
      requester.familyId = newFamily._id;

      // save the requester document into the database.
      await requester.save();

      // then we are changing the familyId variable..
      familyId = newFamily._id;
    } else {

      // and if the familyId be there then we need to see that is the request comes from the head of the family or not ?? if not then we need to generate the error ..
      const family = await Family.findById(familyId);
      if (family.headId.toString() !== requesterId.toString()) {
        throw new Error('Only the head of the family can invite new members');
      }
    }

    // ok now we are checking that if for that recipient and for the same family if there is already invitation sent then we need to generate the error that invitation already pending
    const existingInvite = await FamilyInvite.findOne({
      familyId,
      invitedUserId: recipient._id,
      status: 'pending'
    });

    // here the condition checks and generates the error
    if (existingInvite) {
      throw new Error('An invite is already pending for this email');
    }

    // if not then we need to generate one instance of the FamilyInvite model and then just save it.
    const invite = new FamilyInvite({
      familyId,
      invitedByUserId: requesterId,
      invitedEmail: recipientEmail,
      invitedUserId: recipient._id,
      status: 'pending'
    });

    await invite.save();

    // create the notification instance and then return the invite instance
    await createNotification(
      recipient._id,
      'family-invite',
      `${requester.name || 'A user'} has invited you to join their family group`
    );

    return invite;
  },

  // so this is the function which is executed for the respond to that invitation
  respondToInvite: async (userId, inviteId, action) => {

    // first we need to fetch the document based on the inviteId
    const invite = await FamilyInvite.findById(inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.invitedUserId.toString() !== userId.toString()) {
      throw new Error('Unauthorized');
    }

    if (invite.status !== 'pending') {
      throw new Error('This invite has already been responded to');
    }

    // now we need to fetch the user document from User model
    const recipient = await User.findById(userId);

    // if it already the part od the family then we need to generate the Error
    if (recipient.familyId) {
      throw new Error("You're already part of a family group");
    }

    // then we need to change the status based on the action
    invite.status = action === 'accept' ? 'accepted' : 'rejected';

    // need to change the respondedAt key of the document and then save it
    invite.respondedAt = new Date();
    await invite.save();

    // now if the action is accept then we need to attach the familyId to the current user's document and save it
    if (action === 'accept') {
      recipient.familyId = invite.familyId;
      await recipient.save();
    }

    // now we need to create the notification and return the invite document..
    const actionText = action === 'accept' ? 'joined your family group' : 'declined your invite';
    await createNotification(
      invite.invitedByUserId,
      'family-response',
      `${recipient.name || 'User'} ${actionText}`
    );

    return invite;
  },

  // this is the function which execute the service for familyoverview..
  getFamilyOverview: async (userId) => {

    // first fetch the current loggedIn user document
    const user = await User.findById(userId);

    // if user has not family then we need to return the document containing that fields
    if (!user.familyId) {
      return {
        hasFamily: false,
        isHead: true,
        headInfo: null,
        members: []
      };
    }

    // is user has familyId then we need to get the document from the Family model
    const family = await Family.findById(user.familyId);

    // now we need to fetch all the user who belongs to the same familyId and 
    const allFamilyUsers = await User.find({ familyId: user.familyId })
      .select('name email profilePictureUrl _id');

    // initially we need to set the values to initial values and later on we can change it..
    let isHead = false;
    let headInfo = null;
    const members = [];


    // now we are running the loop over the allFamilyUsers which we fetched from the User database
    for (const member of allFamilyUsers) {

      // we check that current member is head or not??
      const isThisMemberHead = family.headId.toString() === member._id.toString();

      // then we are creating the object of the member data
      const memberData = {
        _id: member._id,
        name: member.name, 
        email: member.email,
        profilePictureUrl: member.profilePictureUrl,
        isHead: isThisMemberHead
      };

      // now if the current member is head then we change the variable which is outside of the loop and if current memeber is not head then we just push the current member to members
      if (isThisMemberHead) {
        headInfo = memberData;
        if (member._id.toString() === userId.toString()) {
          isHead = true;
        }
      } else {
        members.push(memberData);
      }
    }

    return {
      hasFamily: true,
      isHead,
      headInfo,
      members
    };
  },

  getPendingInvitesForUser: async (userId) => {
    const invites = await FamilyInvite.find({
      invitedUserId: userId,
      status: 'pending'
    }).populate('invitedByUserId', 'name email profilePictureUrl');
    return invites;
  },

  getSentInvites: async (headUserId) => {
    const invites = await FamilyInvite.find({
      invitedByUserId: headUserId
    });
    return invites;
  }
};
