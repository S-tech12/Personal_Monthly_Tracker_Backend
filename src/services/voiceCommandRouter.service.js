import Expense from '../models/Expense.model.js';
import { familyService } from './family.service.js';
import * as budgetService from './budget.service.js';
import { generateAndSendReport } from './report.service.js';
import * as expenseService from './expense.service.js';

export const executeVoiceCommands = async (userId, functionCalls) => {
  const results = [];

  // runs the loop over the functioncalls which comes from the parameter
  for (const call of functionCalls) {

    // first from the call extract functionName and args...
    const { functionName, args } = call;


    // now make switch on the functionName
    switch (functionName) {

      // if add_expense be there then we need to create the instance and then we need to push in the results array
      case 'add_expense': {
        const { title, category, amount, currency } = args;
        const newExpense = await Expense.create({
          userId,
          title,
          category,
          amount,
          currency,
          expenseDateTime: new Date(),
          source: 'voice'
        });
        results.push(`Added expense: ${title} (${amount} ${currency}) in ${category}`);
        break;
      }

      // now for that case we need to check that is loggedIn user is head or not ?? if yes then and only then we can update the category budget limit
      case 'update_category_budget_limit': {
        const isHead = await familyService.isHeadUser(userId);
        if (!isHead) {
          throw new Error('Only the head of the family can edit budget limits');
        }

        const { category, changeType, amount, currency } = args;
        
        // Fetch current limit if we need to increase/decrease
        let currentLimit = 0;
        if (changeType === 'increase' || changeType === 'decrease') {
          const overview = await budgetService.getBudgetOverview(userId);
          const catBudget = overview.categoryBudgets.find(b => b.category === category && b.currency === currency);
          if (catBudget && catBudget.monthlyLimit) {
            currentLimit = catBudget.monthlyLimit;
          }
        }

        let newLimit;
        if (changeType === 'increase') newLimit = currentLimit + amount;
        else if (changeType === 'decrease') newLimit = Math.max(currentLimit - amount, 0);
        else newLimit = amount;

        await budgetService.upsertCategoryBudget(userId, { category, monthlyLimit: newLimit, currency });
        results.push(`${category} budget ${changeType}d to ${newLimit} ${currency}`);
        break;
      }

      case 'update_overall_limit': {
        const isHead = await familyService.isHeadUser(userId);
        if (!isHead) {
          throw new Error('Only the head of the family can edit budget limits');
        }

        const { changeType, amount, currency } = args;

        let currentLimit = 0;
        if (changeType === 'increase' || changeType === 'decrease') {
          const overview = await budgetService.getBudgetOverview(userId);
          const ovBudget = overview.overallBudgets.find(b => b.currency === currency);
          if (ovBudget && ovBudget.limit !== null) {
            currentLimit = ovBudget.limit;
          }
        }

        let newLimit;
        if (changeType === 'increase') newLimit = currentLimit + amount;
        else if (changeType === 'decrease') newLimit = Math.max(currentLimit - amount, 0);
        else newLimit = amount;

        await budgetService.setOverallLimit(userId, { currency, limit: newLimit });
        results.push(`Overall monthly limit ${changeType}d to ${newLimit} ${currency}`);
        break;
      }

      case 'request_report': {
        const { startDate, endDate, scope } = args;
        const res = await generateAndSendReport(userId, startDate, endDate, scope);
        results.push(`Report sent: ${res.periodLabel}`);
        break;
      }

      case 'get_spending_summary': {
        const { period } = args;
        const summary = await expenseService.getExpenseSummary(userId);
        let data = [];
        if (period === 'today') {
          data = summary.today;
        } else {
          data = summary.thisMonth;
        }

        if (!data || data.length === 0) {
          results.push(`You have no expenses for ${period.replace('_', ' ')}.`);
        } else {
          const summaryStr = data.map(d => `${d.total} ${d.currency}`).join(', ');
          results.push(`You've spent ${summaryStr} ${period.replace('_', ' ')}.`);
        }
        break;
      }

      case 'get_budget_status': {
        const { category } = args;
        const overview = await budgetService.getBudgetOverview(userId);
        
        if (category) {
          const catBudget = overview.categoryBudgets.find(b => b.category.toLowerCase() === category.toLowerCase());
          if (!catBudget) {
            results.push(`You don't have a budget set for ${category}.`);
          } else {
            results.push(`You've spent ${catBudget.currentSpent} out of your ${catBudget.monthlyLimit} ${catBudget.currency} ${category} budget.`);
          }
        } else {
          if (!overview.overallBudgets || overview.overallBudgets.length === 0) {
            results.push(`You don't have any overall budgets set.`);
          } else {
            const summaryStr = overview.overallBudgets.map(b => 
              `${b.currentSpent} / ${b.limit || 'No Limit'} ${b.currency}`
            ).join(', ');
            results.push(`Overall budget status: ${summaryStr}`);
          }
        }
        break;
      }

      default:
        console.warn(`Unrecognized function call from Gemini: ${functionName}`);
        break;
    }
  }

  return results;
};
