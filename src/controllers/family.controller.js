import { familyService } from '../services/family.service.js';

export const familyController = {
  // this is the function to send the invitation.
  sendInvite: async (req, res, next) => {
    try {

      // first fetch the email from the request object
      let { email } = req.body;
      const errors = {};

      // email validation is there 
      if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
        errors.email = 'Email is required';
      } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Must be a valid email address';
      } else {
        email = email.trim().toLowerCase();
        req.body.email = email;
      }

      // if there is any errors then return the response from here.
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          data: errors
        });
      }

      // get the user's mongoDB id
      const userId = req.user._id;
      
      // now this is the main service function which send the invitation to the user's ID..
      await familyService.sendInvite(userId, email);
      
      res.status(201).json({
        success: true,
        message: 'Invitation sent'
      });
    } catch (error) {
      if (error.message.includes('Only the head')) {
        error.status = 403;
      }
      next(error);
    }
  },

  // this is the function which is responsible to respond the invitation
  respondToInvite: async (req, res, next) => {
    try {

      // first it will fetch the inviteId and action(accept , reject) from the request body
      const { inviteId, action } = req.body;


      const errors = {};

      if (inviteId === undefined || inviteId === null || inviteId === '') {
        errors.inviteId = 'Invite ID is required';
      } else if (typeof inviteId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(inviteId)) {
        errors.inviteId = 'Invalid Invite ID format';
      }

      if (action === undefined || action === null || action === '') {
        errors.action = 'Action is required';
      } else if (!['accept', 'reject'].includes(action)) {
        errors.action = 'Action must be either accept or reject';
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          data: errors
        });
      }

      // first get the mongoDB id from the user object and store in the userId variable
      const userId = req.user._id;
      
      // so this is the main function which is responsible to do that service
      await familyService.respondToInvite(userId, inviteId, action);
      
      res.status(200).json({
        success: true,
        message: `Invite ${action}ed successfully`
      });
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        error.status = 403;
      }
      next(error);
    }
  },

  getOverview: async (req, res, next) => {
    try {
      // first get the user's mongoDB id
      const userId = req.user._id;

      // this is the main service which hanlde this functionality
      const overview = await familyService.getFamilyOverview(userId);
      
      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      next(error);
    }
  },

  getPendingInvites: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const invites = await familyService.getPendingInvitesForUser(userId);
      
      res.status(200).json({
        success: true,
        data: { invites }
      });
    } catch (error) {
      next(error);
    }
  },

  getSentInvites: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const invites = await familyService.getSentInvites(userId);
      
      res.status(200).json({
        success: true,
        data: { invites }
      });
    } catch (error) {
      next(error);
    }
  }
};
