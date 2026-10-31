import User from '../models/user.model.js';
import Budget from '../models/Budget.model.js';
import Expense  from '../models/Expense.model.js';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import { familyService } from './family.service.js';
import Family from '../models/Family.model.js';

export const setOverallLimit = async (userId, { currency, limit }) => {

  // first we need to check that the id which comes from the frontend is head of the family ot not?
  const isHead = await familyService.isHeadUser(userId);
  if (!isHead) {
    throw new Error('Only the head of the family can edit budget limits');
  }

  // if it is then we need to search the document from the User model
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // first we check that in the document there is already limit set for the currency or not and findIndex returns 0 if they found and if not found then it returns -1
  const existingLimitIndex = user.overallMonthlyLimits.findIndex(l => l.currency === currency);
  
  // in the if block code will be executed for the existing currency and in the else block it will push the new currency with limit
  if (existingLimitIndex > -1) {
    user.overallMonthlyLimits[existingLimitIndex].limit = limit;
  } else {
    user.overallMonthlyLimits.push({ currency, limit });
  }

  // it will run the pre-hook so that our document will be updated.
  await user.save();
  return user.overallMonthlyLimits;
};

export const upsertCategoryBudget = async (userId, { category, monthlyLimit, currency }) => {
  // first it will check that is he head or not?
  const isHead = await familyService.isHeadUser(userId);
  if (!isHead) {
    throw new Error('Only the head of the family can edit budget limits');
  }

  // then after it go and search in the budget model and then it will update document
  const budget = await Budget.findOneAndUpdate(
    { userId, category },
    { monthlyLimit, currency },
    { returnDocument: 'after', upsert: true }
  );
  return budget;
};

// this function is responsible to fetch the budget data for the loggedIn user based on the mongoDB id => userId
export const getBudgetOverview = async (userId) => {

  // first fetch the user object from the User model
  const user = await User.findById(userId);
  
  // assume that the member has it's own budget 
  let budgetOwnerId = userId;

  if (user && user.familyId) {

    // we first check that in the document of user is there any familyId means is the user belongs to any family or part of the family then from Family model we need to fetch document and then family's headId becomes the budgetOwnerId
    const family = await Family.findById(user.familyId);
    if (family) {
      budgetOwnerId = family.headId;
    }
  }

  // based on the budgetOwnerId we need to find the user's actual document from User model
  const budgetOwner = await User.findById(budgetOwnerId);

  // then we need to find the overallLimits and if it is empty then we need to store the empty array.
  const overallLimits = budgetOwner ? (budgetOwner.overallMonthlyLimits || []) : [];

  // now from the budget model we need to find the document who's userId is budgetOwnerId
  const categoryBudgets = await Budget.find({ userId: budgetOwnerId });

  // we need to find the Ids of the family members from User model and it returns the array of the mongoDB id of the family members
  const visibleUserIds = await familyService.getVisibleUserIds(userId);

  // by using dayjs library we can get the current month's starting date and end date
  const startOfMonth = dayjs().startOf('month').toDate();
  const endOfMonth = dayjs().endOf('month').toDate();

  // it will just convert the our string id into the because MongoDB aggregation expects ObjectId values
  const objectIdVisibleIds = visibleUserIds.map(id => new mongoose.Types.ObjectId(id));

  // it will calculate the category spending 
  const categorySpends = await Expense.aggregate([
    {
      // first it will filter(match) the document where userid is in the family member's object id array and expenseDateTime is greter then start of month and less then end of month
      $match: {
        userId: { $in: objectIdVisibleIds },
        type: { $ne: 'Credit' },
        expenseDateTime: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    // now it will group the document which has same category and same currency and at the end in the totalSpent += currentdocument.amount we can understand like that
    {
      $group: {
        _id: { category: "$category", currency: "$currency" },
        totalSpent: { $sum: "$amount" }
      }
    }
  ]);

  // now same way it calculates the overall spends
  const overallSpends = await Expense.aggregate([
    {
      // it is just like above
      $match: {
        userId: { $in: objectIdVisibleIds },
        type: { $ne: 'Credit' },
        expenseDateTime: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    // now it group the document who has same currency and then it will add totalSpent += currentdocument.amount
    {
      $group: {
        _id: "$currency",
        totalSpent: { $sum: "$amount" }
      }
    }
  ]);

  // prepare category response
  const mappedCategoryBudgets = categoryBudgets.map(budget => {

    // first it will find the document in the records which we just create using aggregation and from there it will find the document where category and currency matching 
    const spendRecord = categorySpends.find(s => s._id.category === budget.category && s._id.currency === budget.currency);
    
    // And from the category spend, if we found the document, then we will keep it's totalspent, otherwise it will be zero. 
    const currentSpent = spendRecord ? spendRecord.totalSpent : 0;
    
    // And then we return the document with the category, monthly limit, the currency, and the current spend. And for is over limit, if the current spend is greater than budgeted or monthly limit, then it becomes a true, otherwise it becomes a false.
    return {
      category: budget.category,
      monthlyLimit: budget.monthlyLimit,
      currency: budget.currency,
      currentSpent,
      isOverLimit: currentSpent > budget.monthlyLimit
    };
  });

  // this is for the overall budgets 
  const mappedOverallBudgets = [];
  
  // first we loop over the overallLimits array
  overallLimits.forEach(limitEntry => {

    // first we fetch the document where the currency matches
    const spendRecord = overallSpends.find(s => s._id === limitEntry.currency);
    
    // then if the document is there then store it's totalSpent otherwise 0
    const currentSpent = spendRecord ? spendRecord.totalSpent : 0;

    // then we need to push the document in the array don't return it yet because we are running the foreach loop and if we use return then it will skip it
    mappedOverallBudgets.push({
      currency: limitEntry.currency,
      limit: limitEntry.limit,
      currentSpent,
      isOverallOverLimit: currentSpent > limitEntry.limit,
      remaining: limitEntry.limit !== null ? (limitEntry.limit - currentSpent) : null
    });
  });

  // this forEach for that document which has not set the limit but still there is expenses exist in the database so for that also we create the document and push it into the array
  overallSpends.forEach(spendRecord => {
    const hasLimit = overallLimits.some(l => l.currency === spendRecord._id);
    if (!hasLimit) {
      mappedOverallBudgets.push({
        currency: spendRecord._id,
        limit: null,
        currentSpent: spendRecord.totalSpent,
        isOverallOverLimit: false,
        remaining: null
      });
    }
  });

  // finally we return both the arrays..
  return {
    overallBudgets: mappedOverallBudgets,
    categoryBudgets: mappedCategoryBudgets
  };
};



// the response looks like this 
/*
{
  overallBudgets: [
    {
      currency: "INR",
      limit: 50000,
      currentSpent: 32000,
      remaining: 18000,
      isOverallOverLimit: false
    }
  ],

  categoryBudgets: [
    {
      category: "Food",
      monthlyLimit: 5000,
      currentSpent: 4300,
      isOverLimit: false
    },
    {
      category: "Travel",
      monthlyLimit: 3000,
      currentSpent: 4200,
      isOverLimit: true
    }
  ]
}


*/

