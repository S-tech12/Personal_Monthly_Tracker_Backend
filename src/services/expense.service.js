import Expense from '../models/Expense.model.js';
import { parseExpenseFromText } from './gemini.service.js';
import dayjs from 'dayjs';

import User from '../models/user.model.js';
import { familyService } from './family.service.js';

export const createExpenseFromVoice = async (userId, transcript) => {

  // first it will fetch the user from the database based on the userId
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Use Gemini AI to parse the transcript into structured expense data (array) that mean it will passed to the gemini API and then it will return the structured json format
  const parsedExpenses = await parseExpenseFromText(transcript, user.defaultCurrency);
  
  // now twe have created the one date object which is used in every expenses.
  const expenseDateTime = new Date(); // Same timestamp for all items

  // Create an array of expense documents
  const expensesToInsert = parsedExpenses.map(parsedData => ({
    userId,
    title: parsedData.title,
    category: parsedData.category,
    amount: parsedData.amount,
    currency: parsedData.currency,
    type: parsedData.type || 'Debit',
    person: parsedData.person || null,
    transactionDate: parsedData.date || null,
    expenseDateTime,
    source: 'voice'
  }));

  // and yes here all the expenses added into the database.
  const expenses = await Expense.insertMany(expensesToInsert);
  return expenses;
};

export const parseExpensesFromVoice = async (userId, transcript) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return parseExpenseFromText(transcript, user.defaultCurrency);
};

export const createExpenses = async (userId, expenses) => {
  const expenseDateTime = new Date();
  return Expense.insertMany(expenses.map(expense => ({
    userId,
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    type: expense.type || 'Debit',
    person: expense.person || null,
    transactionDate: expense.date || null,
    expenseDateTime,
    source: 'voice'
  })));
};

export const getExpensesByDate = async (userId, dateString) => {
  // ok so first it will fetch the family members mongoDB id from the database based on teh userid
  const visibleUserIds = await familyService.getVisibleUserIds(userId);

  // dateString is expected to be YYYY-MM-DD it takes the start time of today.
  const startOfDay = new Date(dateString);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // it will take the end time of today
  const endOfDay = new Date(dateString);
  endOfDay.setUTCHours(23, 59, 59, 999);


  // now it will fetch all the documents who's id is in the visibleUserIds. and expenseDateTime is greater then today's morning and less then today's night.
  // and then it will attach the user's userId , name , profilePictureUrl then it will sort as expenseDateTime in decreasing order it means newest to oldest ..
  // now lean method is new thing that it will not include all the methods which for mongoose Object so that it will fast and memory effcient and one more thing that by doing this we are just getting the javascript plain object ...
  const expenses = await Expense.find({
    userId: { $in: visibleUserIds },
    expenseDateTime: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  })
  .populate('userId', 'name profilePictureUrl')
  .sort({ expenseDateTime: -1 })
  .lean();

  
  return expenses.map(exp => {
    const { userId: addedBy, ...rest } = exp;
    return {
      ...rest,
      addedBy: addedBy ? { id: addedBy._id, name: addedBy.name, profilePictureUrl: addedBy.profilePictureUrl } : null
    };
  });
};

export const getExpenseSummary = async (userId) => {

  // first it will fetch all the users from the family
  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  
  // now it will create the date object of today
  const now = new Date();

  // Start and end of today
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

  // Start and end of this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setUTCHours(23, 59, 59, 999);


  // now there are 2 parellal aggregation runs in Promise.all([]) method

  const [todaySummary, monthSummary] = await Promise.all([
    Expense.aggregate([
      { 
        // first it will filter the document whose userId in the visibleUserIds and expense time is greaterTHen today and lesser then tonight
        $match: { 
          userId: { $in: visibleUserIds },
          expenseDateTime: { $gte: startOfToday, $lte: endOfToday } 
        } 
      },

      // then it will group the document based on the currency and also side by side there is one variable be there in which the amount will be added
      { 
        $group: { 
          _id: "$currency", 
          total: { $sum: "$amount" } 
        } 
      },

      // ok so it just change our document style i mean before in the document for _id : "INR" then it becomes currency , total remains as it is...
      {
        $project: {
          _id: 0,
          currency: "$_id",
          total: 1
        }
      }
    ]),

    // same for month
    Expense.aggregate([
      { 
        $match: { 
          userId: { $in: visibleUserIds },
          expenseDateTime: { $gte: startOfMonth, $lte: endOfMonth } 
        } 
      },
      { 
        $group: { 
          _id: "$currency", 
          total: { $sum: "$amount" } 
        } 
      },
      {
        $project: {
          _id: 0,
          currency: "$_id",
          total: 1
        }
      }
    ])
  ]);


  // then it just return the expenses.
  return {
    today: todaySummary,
    thisMonth: monthSummary
  };
};

export const getCategoryBreakdown = async (userId) => {

  // first it will fetch all the user's id 
  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  
  // calculate the start and end of the month
  const startOfMonth = dayjs().startOf('month').toDate();
  const endOfMonth = dayjs().endOf('month').toDate();


  // now aggregate function will run on the model
  const breakdown = await Expense.aggregate([
    {
      // first filter the document where userid in the visibleUserIds and expense time greater then start month and lesser then end of month
      $match: {
        userId: { $in: visibleUserIds },
        expenseDateTime: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },

    // now it will group the document based on category and currency combination of both like ₹food and $food are calculating and it is totally different so that we can get the idea and side by side total and count is also increasing
    {
      $group: {
        _id: { category: "$category", currency: "$currency" },
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },

    // it just reframe the document...
    {
      $project: {
        _id: 0,
        category: "$_id.category",
        currency: "$_id.currency",
        total: 1,
        count: 1
      }
    }
  ]);

  return breakdown;
};


// this function is used to get the recent expenses from the database
export const getRecentExpenses = async (userId, limit = 10) => {

  // first it will get the family members Ids
  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  

  // then it will get the expenses from the Expense model and then it will sort in newest to oldest and then it applies the limit so only that document will fetched and then return by doing reframing..
  const expenses = await Expense.find({ userId: { $in: visibleUserIds } })
    .populate('userId', 'name profilePictureUrl')
    .sort({ expenseDateTime: -1 })
    .limit(limit)
    .lean();
    
  return expenses.map(exp => {
    const { userId: addedBy, ...rest } = exp;
    return {
      ...rest,
      addedBy: addedBy ? { id: addedBy._id, name: addedBy.name, profilePictureUrl: addedBy.profilePictureUrl } : null
    };
  });
};
