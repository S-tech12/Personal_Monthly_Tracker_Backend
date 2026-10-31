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

export const createExpenses = async (userId, expenses, source = 'voice') => {
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
    source
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


  const summarize = async (start, end) => {
    const rows = await Expense.aggregate([
      { $match: { userId: { $in: visibleUserIds }, expenseDateTime: { $gte: start, $lte: end } } },
      { $group: { _id: { currency: '$currency', type: '$type' }, total: { $sum: '$amount' } } },
      { $project: { _id: 0, currency: '$_id.currency', type: '$_id.type', total: 1 } }
    ]);
    const grouped = (predicate) => rows.filter(predicate).reduce((result, row) => {
      const existing = result.find(item => item.currency === row.currency);
      if (existing) existing.total += row.total;
      else result.push({ currency: row.currency, total: row.total });
      return result;
    }, []);
    const income = grouped(row => row.type === 'Credit');
    const expenses = grouped(row => row.type !== 'Credit');
    const currencies = [...new Set([...income, ...expenses].map(item => item.currency))];
    const net = currencies.map(currency => ({
      currency,
      total: (income.find(item => item.currency === currency)?.total || 0) - (expenses.find(item => item.currency === currency)?.total || 0)
    }));
    return { income, expenses, net };
  };

  const [todaySummary, monthSummary] = await Promise.all([
    summarize(startOfToday, endOfToday),
    summarize(startOfMonth, endOfMonth)
  ]);

  return {
    // These legacy fields represent spending and must not include income.
    // Keep them for existing frontend consumers while exposing the separated
    // income/expense totals below.
    today: todaySummary.expenses,
    thisMonth: monthSummary.expenses,
    income: { today: todaySummary.income, thisMonth: monthSummary.income },
    expenses: { today: todaySummary.expenses, thisMonth: monthSummary.expenses },
    net: { today: todaySummary.net, thisMonth: monthSummary.net }
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
        type: { $ne: 'Credit' },
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

export const getCurrentMonthExpenses = async (userId) => {
  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  const startOfMonth = dayjs().startOf('month').toDate();
  const endOfMonth = dayjs().endOf('month').toDate();

  const expenses = await Expense.find({
    userId: { $in: visibleUserIds },
    expenseDateTime: { $gte: startOfMonth, $lte: endOfMonth }
  })
    .populate('userId', 'name profilePictureUrl')
    .sort({ expenseDateTime: -1 })
    .lean();

  return expenses.map(expense => {
    const { userId: addedBy, ...rest } = expense;
    return {
      ...rest,
      addedBy: addedBy
        ? { id: addedBy._id, name: addedBy.name, profilePictureUrl: addedBy.profilePictureUrl }
        : null
    };
  });
};

export const getCurrentWeekExpenses = async (userId) => {
  const visibleUserIds = await familyService.getVisibleUserIds(userId);
  const startOfWeek = dayjs().startOf('week').toDate();
  const endOfWeek = dayjs().endOf('week').toDate();

  const expenses = await Expense.find({
    userId: { $in: visibleUserIds },
    expenseDateTime: { $gte: startOfWeek, $lte: endOfWeek }
  })
    .populate('userId', 'name profilePictureUrl')
    .sort({ expenseDateTime: -1 })
    .lean();

  return expenses.map(expense => {
    const { userId: addedBy, ...rest } = expense;
    return {
      ...rest,
      addedBy: addedBy
        ? { id: addedBy._id, name: addedBy.name, profilePictureUrl: addedBy.profilePictureUrl }
        : null
    };
  });
};
