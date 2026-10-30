import { routeVoiceCommand } from '../services/gemini.service.js';
import { executeVoiceCommands } from '../services/voiceCommandRouter.service.js';
import dayjs from 'dayjs';

const ALLOWED_CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Shopping', 
  'Entertainment', 'Bills', 'Health', 'Other'
];


export const handleVoiceCommand = async (req, res, next) => {
  try {

    // first it will get the transcript from the request
    const { transcript } = req.body;
    const errors = {};

    // it validates it 
    if (transcript === undefined || transcript === null || transcript === '') {
      errors.transcript = 'Transcript is required';
    } else if (typeof transcript !== 'string') {
      errors.transcript = 'Transcript must be a string';
    } else if (transcript.length > 500) {
      errors.transcript = 'Transcript cannot exceed 500 characters';
    }

    // if there is any error then it will return the response from here
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }


    // first it will get the userId from the request object
    const userId = req.user._id || req.user.id; // Support both just in case

    // then it will create one context object in which one currectDate is there and one array of all categories be there.
    const context = {
      currentDate: dayjs().format('YYYY-MM-DD'),
      allowedCategories: ALLOWED_CATEGORIES
    };


    // this is the function who uses the gemini api call and get to know that which task the user wants to do either mail or increase the budget or anything else...
    const functionCalls = await routeVoiceCommand(transcript, context);
    

    // it validate that functionCalls are there or not ?? if not then we need to return the response from here...
    if (!functionCalls || functionCalls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "I couldn't understand that request, please try again"
      });
    }


    // now this function takes the responsibility to execute the function call which user wants to do by their voice and it passes and this function will run over the functioncalls and execute the function ....
    const summaries = await executeVoiceCommands(userId, functionCalls);

    res.status(200).json({
      success: true,
      message: "Command executed successfully",
      data: {
        results: summaries
      }
    });

  } catch (error) {
    if (error.message === 'Only the head of the family can edit budget limits') {
      error.statusCode = 403;
    }
    next(error);
  }
};
