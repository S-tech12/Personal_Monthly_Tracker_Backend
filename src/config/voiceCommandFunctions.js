export const voiceCommandFunctions = [
  {
    name: "add_expense",
    description: "Add a new expense. Use this when the user mentions spending money on something. Call this multiple times if multiple distinct items are mentioned.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: {
          type: "STRING",
          description: "A short 1-3 word label of what was spent on."
        },
        category: {
          type: "STRING",
          description: "The category of the expense. Must be exactly one of: Food, Transport, Rent, Shopping, Entertainment, Bills, Health, Other.",
          enum: ["Food", "Transport", "Rent", "Shopping", "Entertainment", "Bills", "Health", "Other"]
        },
        amount: {
          type: "NUMBER",
          description: "The numeric value of the expense only."
        },
        currency: {
          type: "STRING",
          description: "The 3-letter currency code (e.g. INR, USD, EUR). Use the user's default if not specified."
        }
      },
      required: ["title", "category", "amount", "currency"]
    }
  },
  {
    name: "update_category_budget_limit",
    description: "Update the budget limit for a specific category. Use this ONLY when the user explicitly mentions a category like 'food', 'rent', or 'shopping' (e.g., 'increase my food budget by 50'). Do NOT use this for overall/total budgets.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: {
          type: "STRING",
          description: "The category to update.",
          enum: ["Food", "Transport", "Rent", "Shopping", "Entertainment", "Bills", "Health", "Other"]
        },
        changeType: {
          type: "STRING",
          description: "How to adjust the limit: 'increase' to add to it, 'decrease' to subtract, or 'set' to assign a specific new value.",
          enum: ["increase", "decrease", "set"]
        },
        amount: {
          type: "NUMBER",
          description: "The numeric amount to increase, decrease, or set the limit to."
        },
        currency: {
          type: "STRING",
          description: "The 3-letter currency code (e.g. INR, USD, EUR)."
        }
      },
      required: ["category", "changeType", "amount", "currency"]
    }
  },
  {
    name: "update_overall_limit",
    description: "Update the overall, total monthly budget limit. Use this when the user mentions 'overall', 'total', or does NOT mention a specific category (e.g., 'set my overall monthly limit to 20000').",
    parameters: {
      type: "OBJECT",
      properties: {
        changeType: {
          type: "STRING",
          description: "How to adjust the limit: 'increase' to add to it, 'decrease' to subtract, or 'set' to assign a specific new value.",
          enum: ["increase", "decrease", "set"]
        },
        amount: {
          type: "NUMBER",
          description: "The numeric amount to increase, decrease, or set the limit to."
        },
        currency: {
          type: "STRING",
          description: "The 3-letter currency code (e.g. INR, USD, EUR)."
        }
      },
      required: ["changeType", "amount", "currency"]
    }
  },
  {
    name: "request_report",
    description: "Request a PDF/email expense report for a specific date range and scope.",
    parameters: {
      type: "OBJECT",
      properties: {
        startDate: {
          type: "STRING",
          description: "The start date in YYYY-MM-DD format."
        },
        endDate: {
          type: "STRING",
          description: "The end date in YYYY-MM-DD format."
        },
        scope: {
          type: "STRING",
          description: "Who to include in the report. 'everyone' for all family members (e.g., 'our family expenses'), 'others_only' to exclude the speaker (e.g., 'what did everyone else spend'), or 'self_only' (e.g., 'my expenses'). Default is 'everyone'.",
          enum: ["everyone", "others_only", "self_only"]
        }
      },
      required: ["startDate", "endDate", "scope"]
    }
  },
  {
    name: "get_spending_summary",
    description: "Get a quick summary of spending for a specific time period (e.g., 'how much have I spent today', 'what is my spending this month').",
    parameters: {
      type: "OBJECT",
      properties: {
        period: {
          type: "STRING",
          description: "The time period to summarize.",
          enum: ["today", "this_month"]
        }
      },
      required: ["period"]
    }
  },
  {
    name: "get_budget_status",
    description: "Get the current status of a budget limit. If the user asks about a specific category (e.g., 'food budget status'), provide the category. If they ask about their overall budget, leave category empty.",
    parameters: {
      type: "OBJECT",
      properties: {
        category: {
          type: "STRING",
          description: "The specific category to check. If checking overall budget, omit this field."
        }
      }
    }
  }
];
