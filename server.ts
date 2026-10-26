import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Fallback generator for realistic financial advice when API key is not present or API call fails
function generateFallbackAdvice(data: any) {
  const currency = data.currency || '₹';
  const monthlyIncome = Number(data.income || 0) + Number(data.otherIncome || 0);
  const expenses = data.expenses || {};
  
  let totalExpenses = 0;
  for (const cat in expenses) {
    totalExpenses += Number(expenses[cat] || 0);
  }

  const availableBalance = monthlyIncome - totalExpenses;
  const targetSavings = Math.max(0, Math.round(monthlyIncome * 0.2));
  const actualSavingsRate = monthlyIncome > 0 ? Math.round((availableBalance / monthlyIncome) * 100) : 0;
  
  // Categorize Needs, Wants, Savings
  const housing = Number(expenses.housing || expenses['Rent / Housing'] || 0);
  const food = Number(expenses.food || expenses['Food'] || 0);
  const transportation = Number(expenses.transportation || expenses['Transportation'] || 0);
  const utilities = Number(expenses.utilities || expenses['Utilities'] || 0);
  const healthcare = Number(expenses.healthcare || expenses['Healthcare'] || 0);
  const education = Number(expenses.education || expenses['Education'] || 0);

  const entertainment = Number(expenses.entertainment || expenses['Entertainment'] || 0);
  const shopping = Number(expenses.shopping || expenses['Shopping'] || 0);
  const other = Number(expenses.other || expenses['Other'] || 0);

  const needsTotal = housing + food + transportation + utilities + healthcare + education;
  const wantsTotal = entertainment + shopping + other;
  const suggestedSavings = Math.max(0, Math.min(availableBalance, targetSavings));

  // Determine biggest expense category
  let maxExpenseCat = 'Housing';
  let maxExpenseAmount = 0;
  for (const [k, v] of Object.entries(expenses)) {
    const val = Number(v || 0);
    if (val > maxExpenseAmount) {
      maxExpenseAmount = val;
      maxExpenseCat = k.charAt(0).toUpperCase() + k.slice(1);
    }
  }

  const goalName = data.financialGoal || 'Emergency fund';
  const targetAmount = Number(data.targetAmount || 100000);
  const currentSavings = Number(data.currentSavings || 0);
  const remainingForGoal = Math.max(0, targetAmount - currentSavings);
  const monthlySavingsForCalc = availableBalance > 0 ? Math.max(availableBalance, 1000) : 1000;
  const monthsToGoal = Math.ceil(remainingForGoal / monthlySavingsForCalc);

  return {
    budget_plan: {
      total_income: monthlyIncome,
      total_expenses: totalExpenses,
      available_balance: availableBalance,
      needs: {
        total: needsTotal,
        percentage: monthlyIncome > 0 ? Math.round((needsTotal / monthlyIncome) * 100) : 0,
        breakdown: {
          housing,
          food,
          transportation,
          utilities,
          healthcare,
          education,
        },
      },
      wants: {
        total: wantsTotal,
        percentage: monthlyIncome > 0 ? Math.round((wantsTotal / monthlyIncome) * 100) : 0,
        breakdown: {
          entertainment,
          shopping,
          other,
        },
      },
      savings: {
        recommended_monthly: targetSavings,
        actual_surplus: availableBalance,
        percentage: actualSavingsRate,
      },
      rule_50_30_20_comparison: {
        needs_ideal: Math.round(monthlyIncome * 0.5),
        wants_ideal: Math.round(monthlyIncome * 0.3),
        savings_ideal: Math.round(monthlyIncome * 0.2),
        status: actualSavingsRate >= 20 ? 'Optimal' : actualSavingsRate >= 10 ? 'Balanced' : 'Needs Optimization',
      },
    },
    saving_suggestions: [
      {
        id: 'sug-1',
        title: `Optimize ${maxExpenseCat} Allocation`,
        explanation: `Your ${maxExpenseCat.toLowerCase()} expenses are your single largest outgoing commitment at ${currency}${maxExpenseAmount.toLocaleString()}. Look for audit opportunities or recurring subscription trimmings.`,
        potential_saving: `${currency}${Math.round(maxExpenseAmount * 0.1).toLocaleString()}/month`,
        priority: 'High',
        category: maxExpenseCat,
      },
      {
        id: 'sug-2',
        title: 'Discretionary & Dining Budget Cap',
        explanation: `Consolidating dining out, impulsive shopping, and weekend entertainment with a dedicated weekly prepaid allowance creates instant liquidity without affecting quality of life.`,
        potential_saving: `${currency}${Math.round((wantsTotal * 0.15) || 1500).toLocaleString()}/month`,
        priority: 'Medium',
        category: 'Lifestyle',
      },
      {
        id: 'sug-3',
        title: 'Utility & Subscription Recalibration',
        explanation: `Audit monthly broadband plans, streaming tiers, and utility usage. Switching to bundled plans and automated thermostat/power controls commonly yields 8-12% relief.`,
        potential_saving: `${currency}${Math.round(utilities > 0 ? utilities * 0.15 : 600).toLocaleString()}/month`,
        priority: 'Low',
        category: 'Utilities',
      },
      {
        id: 'sug-4',
        title: 'Automated Goal Sweep',
        explanation: `Set an automated bank sweep of ${currency}${Math.round(targetSavings * 0.75).toLocaleString()} on your salary disbursement day before discretionary spending occurs.`,
        potential_saving: `${currency}${Math.round(targetSavings * 0.2).toLocaleString()}/month`,
        priority: 'High',
        category: 'Savings',
      },
    ],
    monthly_summary: {
      health_score: actualSavingsRate >= 20 ? 'Strong' : actualSavingsRate >= 10 ? 'Moderate' : 'Strained',
      health_score_num: Math.min(95, Math.max(35, actualSavingsRate * 3 + 30)),
      overall_summary: `Your cash flow generates a net surplus of ${currency}${availableBalance.toLocaleString()} per month (${actualSavingsRate}% savings rate). Your primary financial target '${goalName}' is ${Math.round((currentSavings / (targetAmount || 1)) * 100)}% funded, pacing you approximately ${monthsToGoal} months to milestone completion.`,
      biggest_category: `${maxExpenseCat} (${currency}${maxExpenseAmount.toLocaleString()})`,
      savings_progress: `${currency}${currentSavings.toLocaleString()} of ${currency}${targetAmount.toLocaleString()} target reached (${monthsToGoal} months projected).`,
      positive_observation: `You maintain an active surplus of ${currency}${availableBalance.toLocaleString()} per month, avoiding high-interest debt cycles.`,
      area_to_improve: `Discretionary and discretionary-adjacent expenses account for ${currency}${wantsTotal.toLocaleString()} (${monthlyIncome > 0 ? Math.round((wantsTotal / monthlyIncome) * 100) : 0}% of net income).`,
      next_month_focus: `Lock in automated transfers to your high-yield emergency reserve within 24 hours of paycheck deposit.`,
    },
    insights: [
      {
        title: 'Cash Flow Buffer',
        value: `${Math.max(0, Math.floor(currentSavings / (totalExpenses || 1)))} months`,
        description: 'Runway covered by current liquid savings based on current burn rate.',
      },
      {
        title: 'Savings Efficiency',
        value: `${actualSavingsRate}%`,
        description: actualSavingsRate >= 20 ? 'Meets recommended 50/30/20 target' : 'Target recommended is 20%',
      },
      {
        title: 'Discretionary Ratio',
        value: `${monthlyIncome > 0 ? Math.round((wantsTotal / monthlyIncome) * 100) : 0}%`,
        description: 'Percentage of total monthly earnings directed towards lifestyle desires.',
      },
    ],
  };
}

// POST /api/financial-advice
app.post('/api/financial-advice', async (req: Request, res: Response) => {
  try {
    const {
      income,
      otherIncome,
      expenses,
      financialGoal,
      targetAmount,
      targetDate,
      currentSavings,
      riskPreference,
      notes,
      currency = '₹',
    } = req.body;

    const dataPayload = {
      income: Number(income || 0),
      otherIncome: Number(otherIncome || 0),
      expenses: expenses || {},
      financialGoal: financialGoal || 'General savings',
      targetAmount: Number(targetAmount || 100000),
      targetDate: targetDate || '12 months',
      currentSavings: Number(currentSavings || 0),
      riskPreference: riskPreference || 'Balanced',
      notes: notes || '',
      currency,
    };

    // If Gemini client is available, attempt generation
    if (aiClient) {
      try {
        const prompt = `You are VanguardIQ, an expert, encouraging, and highly pragmatic personal finance advisor.
Analyze the following financial profile:
- Monthly Income: ${currency}${dataPayload.income}
- Other Monthly Income: ${currency}${dataPayload.otherIncome}
- Monthly Expenses: ${JSON.stringify(dataPayload.expenses)}
- Primary Financial Goal: ${dataPayload.financialGoal}
- Target Amount: ${currency}${dataPayload.targetAmount}
- Target Completion Horizon: ${dataPayload.targetDate}
- Current Savings: ${currency}${dataPayload.currentSavings}
- Risk Preference: ${dataPayload.riskPreference}
- User Notes: ${dataPayload.notes || 'None'}
- Currency: ${currency}

Produce a detailed, realistic financial advisory response strictly in valid JSON adhering to the specified schema.
Provide exact numerical figures, realistic actionable saving suggestions, and structured breakdown for Needs, Wants, and Savings.
Be encouraging, realistic, and do not make false guarantees.`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: 'You are VanguardIQ, a certified financial coach. Return ONLY valid structured JSON matching the requested structure without markdown code fences.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                budget_plan: {
                  type: Type.OBJECT,
                  properties: {
                    total_income: { type: Type.NUMBER },
                    total_expenses: { type: Type.NUMBER },
                    available_balance: { type: Type.NUMBER },
                    needs: {
                      type: Type.OBJECT,
                      properties: {
                        total: { type: Type.NUMBER },
                        percentage: { type: Type.NUMBER },
                        breakdown: {
                          type: Type.OBJECT,
                          properties: {
                            housing: { type: Type.NUMBER },
                            food: { type: Type.NUMBER },
                            transportation: { type: Type.NUMBER },
                            utilities: { type: Type.NUMBER },
                            healthcare: { type: Type.NUMBER },
                            education: { type: Type.NUMBER },
                          },
                        },
                      },
                    },
                    wants: {
                      type: Type.OBJECT,
                      properties: {
                        total: { type: Type.NUMBER },
                        percentage: { type: Type.NUMBER },
                        breakdown: {
                          type: Type.OBJECT,
                          properties: {
                            entertainment: { type: Type.NUMBER },
                            shopping: { type: Type.NUMBER },
                            other: { type: Type.NUMBER },
                          },
                        },
                      },
                    },
                    savings: {
                      type: Type.OBJECT,
                      properties: {
                        recommended_monthly: { type: Type.NUMBER },
                        actual_surplus: { type: Type.NUMBER },
                        percentage: { type: Type.NUMBER },
                      },
                    },
                    rule_50_30_20_comparison: {
                      type: Type.OBJECT,
                      properties: {
                        needs_ideal: { type: Type.NUMBER },
                        wants_ideal: { type: Type.NUMBER },
                        savings_ideal: { type: Type.NUMBER },
                        status: { type: Type.STRING },
                      },
                    },
                  },
                  required: ['total_income', 'total_expenses', 'available_balance', 'needs', 'wants', 'savings'],
                },
                saving_suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      potential_saving: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      category: { type: Type.STRING },
                    },
                    required: ['title', 'explanation', 'potential_saving', 'priority'],
                  },
                },
                monthly_summary: {
                  type: Type.OBJECT,
                  properties: {
                    health_score: { type: Type.STRING },
                    health_score_num: { type: Type.NUMBER },
                    overall_summary: { type: Type.STRING },
                    biggest_category: { type: Type.STRING },
                    savings_progress: { type: Type.STRING },
                    positive_observation: { type: Type.STRING },
                    area_to_improve: { type: Type.STRING },
                    next_month_focus: { type: Type.STRING },
                  },
                  required: [
                    'health_score',
                    'overall_summary',
                    'biggest_category',
                    'savings_progress',
                    'positive_observation',
                    'area_to_improve',
                    'next_month_focus',
                  ],
                },
                insights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      value: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ['title', 'value', 'description'],
                  },
                },
              },
              required: ['budget_plan', 'saving_suggestions', 'monthly_summary', 'insights'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({ success: true, source: 'gemini', data: parsed });
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to algorithmic analyzer:', geminiError);
      }
    }

    // High quality deterministic fallback when AI key is missing or errored
    const fallback = generateFallbackAdvice(dataPayload);
    return res.json({ success: true, source: 'fallback', data: fallback });
  } catch (error: any) {
    console.error('Error generating financial advice:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate financial plan. Please check inputs and try again.',
      details: error.message,
    });
  }
});

// POST /api/chat-advice
app.post('/api/chat-advice', async (req: Request, res: Response) => {
  try {
    const { question, financialContext, history } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const currency = financialContext?.currency || '₹';

    if (aiClient) {
      try {
        const contextStr = financialContext
          ? `User Financial Context:
- Monthly Income: ${currency}${financialContext.income}
- Total Expenses: ${currency}${financialContext.totalExpenses}
- Net Monthly Surplus: ${currency}${financialContext.availableBalance}
- Savings Goal: "${financialContext.financialGoal}" (Target: ${currency}${financialContext.targetAmount}, Current: ${currency}${financialContext.currentSavings})
- Risk Profile: ${financialContext.riskPreference || 'Balanced'}`
          : 'User has not completed the financial questionnaire yet.';

        const chatPrompt = `You are VanguardIQ, an expert, compassionate personal finance mentor.
${contextStr}

User Question: "${question}"

Provide a direct, practical, and highly actionable response formatted in clean markdown (with bullet points or mini-steps if appropriate).
Keep your tone encouraging, professional, and grounded. Include specific calculations or timeline references where applicable using the user's currency (${currency}).
Remind the user gently where relevant that this is educational planning rather than legal investment advice.`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: chatPrompt,
          config: {
            systemInstruction: 'You are VanguardIQ, an empathetic and analytical personal financial advisor.',
          },
        });

        if (response.text) {
          return res.json({ success: true, answer: response.text });
        }
      } catch (geminiError) {
        console.warn('Gemini chat API call failed, generating contextual response:', geminiError);
      }
    }

    // Contextual rule-based smart answer for fallback / demo mode
    const qLower = question.toLowerCase();
    let answer = '';

    const income = Number(financialContext?.income || 55000);
    const expenses = Number(financialContext?.totalExpenses || 40000);
    const balance = income - expenses;
    const goal = financialContext?.financialGoal || 'Emergency fund';
    const target = Number(financialContext?.targetAmount || 150000);
    const savings = Number(financialContext?.currentSavings || 40000);

    if (qLower.includes('save') && (qLower.includes('more') || qLower.includes('5000') || qLower.includes('how can i'))) {
      answer = `### Action Plan to Save ${currency}5,000+ More Monthly

Based on your current financial profile (Surplus: **${currency}${balance.toLocaleString()}/month**):

1. **Dining & Groceries Optimization (~${currency}2,200/mo):**
   Meal planning on Sundays and reducing food delivery orders by 2 days a week will immediately recapture significant capital without compromising nutrition.
2. **Subscription Audit (~${currency}800/mo):**
   Audit app subscriptions, unused gym passes, and streaming tiers. Downgrading to annual plans or canceling inactive memberships quickly frees up recurring cash.
3. **Utility & Discretionary Cap (~${currency}2,000/mo):**
   Institute a 48-hour "cooling off" rule for any non-essential purchase exceeding ${currency}1,500.

*Compounding Impact:* Reinvesting ${currency}5,000/month at a modest 7% annual yield accumulates to over **${currency}3,60,000+** within 5 years!`;
    } else if (qLower.includes('where am i spending') || qLower.includes('too much') || qLower.includes('cut')) {
      answer = `### Spending Hotspots Analysis

Looking at your expenses:
- **Primary Outflow:** Housing and core necessities form the foundation of your budget.
- **Discretionary Leakage:** Non-essential categories (entertainment, dining out, impulsive online shopping) typically represent 20–35% of total spend.
- **Recommended Benchmark:** Ensure discretionary expenses do not exceed **30%** of your net monthly earnings. Currently, redirecting just 10% of flexible spending would expand your emergency runway by 2.4 months.`;
    } else if (qLower.includes('how long') || qLower.includes('goal') || qLower.includes('reach')) {
      const remaining = Math.max(0, target - savings);
      const monthlyRate = balance > 0 ? balance : 5000;
      const months = Math.ceil(remaining / monthlyRate);
      answer = `### Timeline to Reach "${goal}"

- **Target Amount:** ${currency}${target.toLocaleString()}
- **Current Savings:** ${currency}${savings.toLocaleString()}
- **Remaining Gap:** ${currency}${remaining.toLocaleString()}
- **Current Monthly Surplus:** ${currency}${balance.toLocaleString()}/month

**Estimated Timeline:** Approximately **${months} months** at your current saving velocity.
*Pro Tip:* If you boost savings by just ${currency}3,000/month through the suggested optimizations, you will reach your goal **${Math.max(1, Math.round(months * 0.25))} months sooner**!`;
    } else if (qLower.includes('afford') || qLower.includes('healthy') || qLower.includes('debt')) {
      const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
      answer = `### Financial Affordability Assessment

- **Savings Rate:** **${savingsRate}%** (Recommended benchmark: 20%)
- **Cash Flow State:** You maintain a **positive cash buffer** of ${currency}${balance.toLocaleString()} each month.
- **Verdict:** Yes, your current expenditure is within manageable limits, but you can build a stronger protective moat by automating your savings into a separate high-yield emergency reserve first.`;
    } else {
      answer = `### VanguardIQ Guidance

Thank you for your question regarding: *"${question}"*

Here are key principles applied to your profile:
1. **Pay Yourself First:** Automate your target savings of ${currency}${Math.round(income * 0.2).toLocaleString()} before allocating discretionary funds.
2. **Buffer Protection:** Maintain 3–6 months of essential living expenses (${currency}${(expenses * 3).toLocaleString()}) in a liquid emergency account.
3. **Debt-Free Growth:** Ensure any credit cards are paid in full monthly to avoid compounding interest erosion.

*Note: VanguardIQ recommendations are educational estimates to assist your personal budgeting.*`;
    }

    return res.json({ success: true, answer });
  } catch (error: any) {
    console.error('Error in chat advice:', error);
    return res.status(500).json({ error: 'Failed to process chat question' });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(aiClient),
    timestamp: new Date().toISOString(),
  });
});

// Configure Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VanguardIQ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
