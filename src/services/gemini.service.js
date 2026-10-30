import { GoogleGenerativeAI } from '@google/generative-ai';
import { voiceCommandFunctions } from '../config/voiceCommandFunctions.js';

const ALLOWED_CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Shopping', 
  'Entertainment', 'Bills', 'Health', 'Other'
];
const ALLOWED_INCOME_CATEGORIES = ['Salary', 'Freelancing', 'Sales', 'Gift', 'Refund', 'Other'];

const CREDIT_TERMS = /salary|cashback|cash back|refund|received|receive|credit|credited|income|earned|bonus|from /i;
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

const generateContentWithRetry = async (model, prompt) => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      const message = error?.message || '';
      const isTemporary = /\b(429|500|502|503|504)\b|high demand|temporarily unavailable/i.test(message);
      if (!isTemporary || attempt === maxAttempts) {
        if (isTemporary) {
          const unavailableError = new Error('The AI transaction parser is temporarily busy. Please try again in a moment.');
          unavailableError.statusCode = 503;
          throw unavailableError;
        }
        throw error;
      }
      await sleep(800 * (2 ** (attempt - 1)));
    }
  }
};

const recoverMissingTransactions = (transcript, transactions, defaultCurrency, currentDate) => {
  const amounts = [...transcript.matchAll(/(?:₹|rs\.?|inr\s*)?\s*([0-9][0-9,]*(?:\.\d+)?)/gi)]
    .map(match => ({ amount: Number(match[1].replace(/,/g, '')), index: match.index || 0, raw: match[0] }))
    .filter(item => item.amount > 0);

  return amounts.reduce((result, item, index) => {
    if (result.some(transaction => transaction.amount === item.amount)) return result;
    const start = index > 0 ? amounts[index - 1].index + amounts[index - 1].raw.length : 0;
    const end = index < amounts.length - 1 ? amounts[index + 1].index : transcript.length;
    const context = transcript.slice(start, end).replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
    const isCredit = CREDIT_TERMS.test(context);
    const type = isCredit ? 'Credit' : 'Debit';
    const personMatch = context.match(/\bfrom\s+([A-Z][a-z]+)\b/);
    const person = personMatch ? personMatch[1] : null;
    const titleMatch = context.match(/(?:on|for|in|at|from|selling|earned|salary|received|paid|spent)\s+(.+?)(?:\s+\d|$)/i);
    const title = (titleMatch?.[1] || (isCredit ? 'Income' : 'Expense'))
      .replace(/\b(?:and|then|another)\b.*$/i, '')
      .replace(/[.,!?]+$/, '')
      .trim();
    const category = type === 'Credit'
      ? (/(salary|wage)/i.test(title) ? 'Salary' : /freelanc/i.test(title) ? 'Freelancing' : /sell/i.test(title) ? 'Sales' : 'Other')
      : (/rent/i.test(title) ? 'Rent' : /food|grocer/i.test(title) ? 'Food' : /internet|electric|bill/i.test(title) ? 'Bills' : /petrol|fuel/i.test(title) ? 'Transport' : 'Other');
    result.push({ title: title || (isCredit ? 'Income' : 'Expense'), category, amount: item.amount, currency: defaultCurrency, type, person, date: currentDate });
    return result;
  }, [...transactions]);
};

export const parseExpenseFromText = async (transcript, defaultCurrency) => {
  try {
    // first it will check that gemini api key is there or not ?? if not then it will generate the error .
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // now new instance will be created from SDK using api key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // now this create the model of the generativeModel and for that we have used 3.5 flash version
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    });

    // now this is the prompt in which  epass the transcript and says gemini to extract the meaning and then convert it into the json format
    const currentDate = new Date().toISOString().slice(0, 10);
    const prompt = `
You are a financial transaction parser for a voice-based money tracker.
The user said: "${transcript}"

Extract EVERY transaction and classify each one as either an expense or an income.
EXPENSE means money going out: paid, spent, bought, gave, sent, bill, rent, recharge, donated, lent.
INCOME means money coming in: earned, received, got, salary, sold, selling, refund, cashback, credited, bonus, or from a person.
"Received X from <person>" is income. "Paid/gave/sent X to <person>" is expense. Selling an item is income.
Never skip an amount. Every amount must appear exactly once.

For each item: amount must be a number without symbols or commas; title must be short; person is the named person or null; date is YYYY-MM-DD. Today is ${currentDate}; yesterday is the previous day; unspecified dates use ${currentDate}.
Expense categories: Food, Rent, Bills, Transport, Shopping, Health, Entertainment, Other.
Income categories: Salary, Freelancing, Sales, Gift, Refund, Other.

Return ONLY valid JSON in exactly this shape, including both keys:
{
  "expenses": [{ "title": "", "amount": 0, "category": "", "person": null, "date": "" }],
  "incomes": [{ "title": "", "amount": 0, "category": "", "person": null, "date": "" }]
}
    `.trim();


    // now we are calling the generateContent() method and passes the prompt method so that it thinks and generate the response.
    const result = await generateContentWithRetry(model, prompt);

    // now we convert it into the text format using text() method
    let text = result.response.text();

    // this is the just the console...
    console.log('[DEBUG Gemini Raw Output]:', text);

    // More robust stripping -> i don't know exactly what is this...
    text = text.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    else if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();
    console.log('[DEBUG Gemini Stripped Output]:', text);


    // now this is the variable in which we are converting our text data into the json format and if there is any error it will caught in catch block and new error will be thrown
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (err) {
      console.error('[DEBUG JSON Parse Error]:', err.message);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // now we are checking that the parsedData is array or not? or it's length is > 0 or not if both condition are not satisfied then we are generating new error.
    const items = [
      ...(Array.isArray(parsedData) ? parsedData.filter(item => item.type !== 'Credit') : (parsedData.expenses || []).map(item => ({ ...item, type: 'Debit' }))),
      ...(Array.isArray(parsedData) ? parsedData.filter(item => item.type === 'Credit') : (parsedData.incomes || []).map(item => ({ ...item, type: 'Credit' })))
    ];
    if (items.length === 0) {
      throw new Error('Expected at least one transaction');
    }

    console.log('[DEBUG validated]:', items);
    // Validation and also creating the array that will be returned to the expense.service.js file function from where this function is called.
    const validatedExpenses = items.map(item => {
    const { title, category, amount, currency, type, person, date } = item;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        throw new Error('Invalid or missing title in one of the items');
      }
      
      if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be a positive number in one of the items');
      }

      const inferredType = type === 'Credit' || CREDIT_TERMS.test(title) ? 'Credit' : 'Debit';
      const categoryList = inferredType === 'Credit' ? ALLOWED_INCOME_CATEGORIES : ALLOWED_CATEGORIES;
      const finalCategory = categoryList.includes(category) ? category : 'Other';
      const finalCurrency = (currency && typeof currency === 'string') ? currency.toUpperCase() : defaultCurrency;

      return {
        title: title.trim(),
        category: finalCategory,
        amount,
        currency: finalCurrency,
        type: inferredType,
        person: person || null,
        date: date || currentDate
      };
    });

    return recoverMissingTransactions(transcript, validatedExpenses, defaultCurrency, currentDate);
  } catch (error) {
    console.error('Gemini parsing error:', error.message, error.stack);
    throw new Error('Could not understand the expense details, please try again');
  }
};

export const parseReportRequest = async (transcript, currentDate) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `
You are an AI assistant that extracts date ranges and scope from natural language requests about financial reports.
The current date is: ${currentDate}.
Extract the exact start date, end date, and scope based on the user's spoken request: "${transcript}"

Rules for Dates:
- If the user asks for a single day ("today", "yesterday", "for 10 July"), both startDate and endDate should be that day.
- If the user asks for a month ("this month", "last month", "July"), return the first and last day of that month.

Rules for Scope:
- "self_only": Phrases like "my expenses", "expenses I made", "what did I spend"
- "others_only": Phrases like "family members' expenses", "expenses done by my family members", "what did everyone else spend" (explicitly excluding the requesting user)
- "everyone": Phrases like "our family's expenses", "total family expenses", "everyone's spending", "combined expenses" (includes the requesting user). If the scope isn't clearly indicated, default to "everyone".

- If the request is ambiguous or does not appear to be asking for a report date range, return exactly: { "error": "unclear_request" }

Respond with ONLY raw JSON, no markdown fences, no explanation.
If a valid date range is found, the JSON must be:
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "scope": "everyone" | "others_only" | "self_only"
}
    `.trim();

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    text = text.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    else if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch (err) {
      throw new Error('Failed to parse Gemini response as JSON');
    }

    if (parsedData.error === 'unclear_request') {
      throw new Error('Could not understand the date range, please try again');
    }

    if (!parsedData.startDate || !parsedData.endDate) {
      throw new Error('Could not understand the date range, please try again');
    }

    const start = new Date(parsedData.startDate);
    const end = new Date(parsedData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new Error('Could not understand the date range, please try again');
    }

    const validScopes = ['everyone', 'others_only', 'self_only'];
    const scope = validScopes.includes(parsedData.scope) ? parsedData.scope : 'everyone';

    return { startDate: parsedData.startDate, endDate: parsedData.endDate, scope };
  } catch (error) {
    console.error('Gemini report parsing error:', error.message);
    throw new Error(error.message === 'Could not understand the date range, please try again' 
      ? error.message 
      : 'Could not understand the date range, please try again');
  }
};

export const routeVoiceCommand = async (transcript, context) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Convert tool format to match Gemini API if necessary, but according to latest SDK it accepts an array of function declarations directly inside `tools`
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      tools: [{ functionDeclarations: voiceCommandFunctions }]
    });

    const prompt = `
Determine which action(s) the user wants based on the transcript: "${transcript}".
Context:
- Current Date: ${context.currentDate}
- Allowed Categories: ${context.allowedCategories.join(', ')}

Only call functions from the provided list. If unclear or no match, do not call any function. If the user mentions spending money without a clear category, use 'Other'. If they specify a currency not supported, use their default or 'USD'.
    `.trim();

    const result = await model.generateContent(prompt);
    
    const calls = result.response.functionCalls();
    
    if (!calls || calls.length === 0) {
      const err = new Error("I couldn't understand that request, please try again");
      err.statusCode = 400;
      throw err;
    }

    const parsedCalls = calls.map(call => {
      return {
        functionName: call.name,
        args: call.args
      };
    });

    return parsedCalls;

  } catch (error) {
    console.error('Gemini voice routing error:', error.message);
    if (error.statusCode) throw error;
    
    const err = new Error("I couldn't understand that request, please try again");
    err.statusCode = 400;
    throw err;
  }
};

