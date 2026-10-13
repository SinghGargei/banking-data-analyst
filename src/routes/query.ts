import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db/connection';
import { config } from '../config/env';
import { AppError } from '../types/express.types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ResultFormat = 'table' | 'metric' | 'chart' | 'json';

export interface QueryResponse {
  answerText: string;
  data: Record<string, unknown>[];
  sql: string;
  format: ResultFormat;
}

export interface QueryRequestBody {
  question?: string;
  sql?: string;
}

export class SecurityGuardrailError extends AppError {
  constructor(message: string) {
    super(message, 403, true);
    this.name = 'SecurityGuardrailError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================================
// Security Guardrail: Strict Read-Only Validation
// ============================================================================

/**
 * Validates and sanitizes SQL queries to guarantee read-only execution.
 * Blocks any destructive, mutating, or administrative commands.
 */
export function validateSecurityGuardrail(rawSql: string): string {
  if (!rawSql || typeof rawSql !== 'string') {
    throw new SecurityGuardrailError('SQL query string must be provided and non-empty.');
  }

  // 1. Strip markdown fences, inline code blocks, and comments
  let cleaned = rawSql
    .replace(/```(?:sql)?/gi, '')
    .replace(/```/g, '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Strip trailing semicolons
  cleaned = cleaned.replace(/;+\s*$/, '').trim();

  // 2. Reject multi-statement execution (prevent injection of stacked queries)
  if (cleaned.includes(';')) {
    throw new SecurityGuardrailError('Security Guardrail Violation: Multiple SQL statements are strictly forbidden.');
  }

  // 3. Must begin strictly with SELECT or WITH (for Common Table Expressions)
  const isSelectOrWith = /^(SELECT|WITH)\b/i.test(cleaned);
  if (!isSelectOrWith) {
    throw new SecurityGuardrailError(
      'Security Guardrail Violation: Query must start strictly with a read-only SELECT or WITH statement.'
    );
  }

  // 4. Prohibit any destructive, mutating, or elevated commands anywhere in the query
  const FORBIDDEN_COMMANDS = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|REPLACE|UPSERT|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX|GRANT|REVOKE|EXEC|EXECUTE)\b/i;
  const match = cleaned.match(FORBIDDEN_COMMANDS);
  if (match) {
    throw new SecurityGuardrailError(
      `Security Guardrail Violation: Detected prohibited command '${match[0].toUpperCase()}'. Only read-only analytics queries are permitted.`
    );
  }

  // 5. Append safety limit if no LIMIT clause exists to prevent runaway memory usage
  if (!/\bLIMIT\b/i.test(cleaned)) {
    cleaned = `${cleaned} LIMIT 100`;
  }

  return cleaned;
}

/**
 * Express middleware for validating user-supplied or AI-generated SQL payloads
 */
export function validateSqlGuardrailMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const { sql } = req.body as QueryRequestBody;
  if (sql) {
    try {
      req.body.sql = validateSecurityGuardrail(sql);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
}

// ============================================================================
// Rule-Based Fallback Engine
// ============================================================================

interface RuleMatch {
  sql: string;
  format: ResultFormat;
  generateAnswerText: (data: Record<string, unknown>[], question: string) => string;
}

/**
 * Intelligent rule-based query selector for banking datasets.
 * Automatically activates on API rate limits, model overload, or connection issues.
 */
export async function executeRuleBasedFallback(
  question: string,
  fallbackReason = 'Rule-based fallback engine'
): Promise<QueryResponse> {
  const q = question.toLowerCase();

  let match: RuleMatch;

  // --------------------------------------------------------------------------
  // Category 1: Applications Dataset
  // --------------------------------------------------------------------------
  if (
    q.includes('application') ||
    q.includes('segment') ||
    q.includes('retail') ||
    q.includes('sme') ||
    q.includes('corporate') ||
    q.includes('wealth') ||
    q.includes('agriculture') ||
    q.includes('applied') ||
    q.includes('applicant')
  ) {
    if (q.includes('retail')) {
      match = {
        sql: "SELECT month, segment, count FROM applications WHERE LOWER(segment) = 'retail' ORDER BY month ASC LIMIT 50;",
        format: 'chart',
        generateAnswerText: (rows) => {
          const total = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
          return `Found ${rows.length} months of Retail application data representing a cumulative ${total.toLocaleString()} applications across all recorded periods.`;
        },
      };
    } else if (q.includes('sme')) {
      match = {
        sql: "SELECT month, segment, count FROM applications WHERE LOWER(segment) = 'sme' ORDER BY month ASC LIMIT 50;",
        format: 'chart',
        generateAnswerText: (rows) => {
          const total = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
          return `SME commercial application volume totals ${total.toLocaleString()} applications across ${rows.length} recorded reporting periods.`;
        },
      };
    } else if (q.includes('corporate')) {
      match = {
        sql: "SELECT month, segment, count FROM applications WHERE LOWER(segment) = 'corporate' ORDER BY month ASC LIMIT 50;",
        format: 'chart',
        generateAnswerText: (rows) => {
          const total = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
          return `Corporate banking applications aggregate to ${total.toLocaleString()} submissions across ${rows.length} monitored months.`;
        },
      };
    } else if (q.includes('breakdown') || q.includes('share') || q.includes('by segment') || q.includes('distribution')) {
      match = {
        sql: `SELECT 
                segment, 
                SUM(count) as total_applications, 
                ROUND(AVG(count), 1) as avg_monthly_count 
              FROM applications 
              GROUP BY segment 
              ORDER BY total_applications DESC;`,
        format: 'table',
        generateAnswerText: (rows) => {
          const top = rows[0] as { segment?: string; total_applications?: number } | undefined;
          return `Application portfolio breakdown by business segment. ${top?.segment || 'Retail'} leads the overall portfolio with ${Number(top?.total_applications || 0).toLocaleString()} total applications.`;
        },
      };
    } else if (q.includes('trend') || q.includes('by month') || q.includes('monthly') || q.includes('over time')) {
      match = {
        sql: `SELECT 
                month, 
                SUM(count) as total_applications 
              FROM applications 
              GROUP BY month 
              ORDER BY month ASC;`,
        format: 'chart',
        generateAnswerText: (rows) => {
          return `Monthly application trends across all segments over ${rows.length} historical months showing aggregate application trajectory.`;
        },
      };
    } else {
      match = {
        sql: 'SELECT month, segment, count FROM applications ORDER BY month DESC, count DESC LIMIT 15;',
        format: 'table',
        generateAnswerText: (rows) => {
          return `Recent banking applications across segments. Displaying ${rows.length} current period records.`;
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // Category 2: Branches Dataset (Rejection Rates)
  // --------------------------------------------------------------------------
  else if (
    q.includes('branch') ||
    q.includes('rejection') ||
    q.includes('reject') ||
    q.includes('approval') ||
    q.includes('denial')
  ) {
    if (q.includes('highest') || q.includes('worst') || q.includes('max') || q.includes('top rejection')) {
      match = {
        sql: 'SELECT name, rejection_rate FROM branches ORDER BY rejection_rate DESC LIMIT 5;',
        format: 'table',
        generateAnswerText: (rows) => {
          const worst = rows[0] as { name?: string; rejection_rate?: number } | undefined;
          const ratePct = worst?.rejection_rate ? (worst.rejection_rate * 100).toFixed(2) : '0';
          return `The branch with the highest credit rejection rate is "${worst?.name || 'Unknown'}" at ${ratePct}%, followed by the next 4 highest risk branches.`;
        },
      };
    } else if (q.includes('lowest') || q.includes('best') || q.includes('min') || q.includes('least')) {
      match = {
        sql: 'SELECT name, rejection_rate FROM branches ORDER BY rejection_rate ASC LIMIT 5;',
        format: 'table',
        generateAnswerText: (rows) => {
          const best = rows[0] as { name?: string; rejection_rate?: number } | undefined;
          const ratePct = best?.rejection_rate ? (best.rejection_rate * 100).toFixed(2) : '0';
          return `The branch with the lowest credit rejection rate is "${best?.name || 'Unknown'}" at ${ratePct}%, representing the highest relative approval efficiency.`;
        },
      };
    } else if (q.includes('average') || q.includes('mean') || q.includes('overall rate')) {
      match = {
        sql: `SELECT 
                ROUND(AVG(rejection_rate), 4) as avg_rejection_rate, 
                MIN(rejection_rate) as min_rejection_rate, 
                MAX(rejection_rate) as max_rejection_rate, 
                COUNT(*) as total_branches 
              FROM branches;`,
        format: 'metric',
        generateAnswerText: (rows) => {
          const stats = rows[0] as { avg_rejection_rate?: number; min_rejection_rate?: number; max_rejection_rate?: number } | undefined;
          const avgPct = stats?.avg_rejection_rate ? (stats.avg_rejection_rate * 100).toFixed(2) : '0';
          return `Across all banking branches, the average credit rejection rate stands at ${avgPct}%, with rates spanning from ${(Number(stats?.min_rejection_rate || 0) * 100).toFixed(2)}% to ${(Number(stats?.max_rejection_rate || 0) * 100).toFixed(2)}%.`;
        },
      };
    } else {
      match = {
        sql: 'SELECT name, rejection_rate FROM branches ORDER BY rejection_rate DESC LIMIT 15;',
        format: 'table',
        generateAnswerText: (rows) => {
          return `Overview of ${rows.length} bank branches ranked by operational credit rejection rate.`;
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // Category 3: Customers Dataset (Transaction Values)
  // --------------------------------------------------------------------------
  else if (
    q.includes('customer') ||
    q.includes('client') ||
    q.includes('transaction') ||
    q.includes('value') ||
    q.includes('volume') ||
    q.includes('wealth') ||
    q.includes('balance')
  ) {
    if (q.includes('top') || q.includes('largest') || q.includes('highest') || q.includes('wealthiest') || q.includes('richest')) {
      match = {
        sql: 'SELECT name, transaction_value FROM customers ORDER BY transaction_value DESC LIMIT 5;',
        format: 'table',
        generateAnswerText: (rows) => {
          const topClient = rows[0] as { name?: string; transaction_value?: number } | undefined;
          const valFormatted = Number(topClient?.transaction_value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
          return `Top banking customer is "${topClient?.name || 'Unknown'}" with total transaction volume of ${valFormatted}. Here are the top 5 premier accounts.`;
        },
      };
    } else if (q.includes('total volume') || q.includes('sum') || q.includes('average transaction') || q.includes('stats')) {
      match = {
        sql: `SELECT 
                ROUND(SUM(transaction_value), 2) as total_transaction_volume, 
                ROUND(AVG(transaction_value), 2) as avg_transaction_value, 
                COUNT(*) as total_customers 
              FROM customers;`,
        format: 'metric',
        generateAnswerText: (rows) => {
          const stat = rows[0] as { total_transaction_volume?: number; avg_transaction_value?: number; total_customers?: number } | undefined;
          const totalFmt = Number(stat?.total_transaction_volume || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
          const avgFmt = Number(stat?.avg_transaction_value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
          return `Total cumulative transaction volume is ${totalFmt} across ${stat?.total_customers || 0} customer relationships, averaging ${avgFmt} per client.`;
        },
      };
    } else if (q.includes('tier') || q.includes('million') || q.includes('enterprise') || q.includes('corporate')) {
      match = {
        sql: 'SELECT name, transaction_value FROM customers WHERE transaction_value >= 1000000 ORDER BY transaction_value DESC LIMIT 20;',
        format: 'table',
        generateAnswerText: (rows) => {
          return `Identified ${rows.length} high-value enterprise and institutional relationships with transaction volumes exceeding $1,000,000.`;
        },
      };
    } else {
      match = {
        sql: 'SELECT name, transaction_value FROM customers ORDER BY transaction_value DESC LIMIT 15;',
        format: 'table',
        generateAnswerText: (rows) => {
          return `Banking customer portfolio overview displaying ${rows.length} clients ordered by transaction value.`;
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // Category 4: Executive Overview / Unclassified Banking Inquiries
  // --------------------------------------------------------------------------
  else {
    match = {
      sql: `SELECT 
              'applications' as dataset, 
              SUM(count) as metric_value, 
              'Total Volume' as metric_label 
            FROM applications 
            UNION ALL 
            SELECT 
              'branches' as dataset, 
              ROUND(AVG(rejection_rate), 4) as metric_value, 
              'Avg Rejection Rate' as metric_label 
            FROM branches 
            UNION ALL 
            SELECT 
              'customers' as dataset, 
              ROUND(SUM(transaction_value), 2) as metric_value, 
              'Total Portfolio Value' as metric_label 
            FROM customers;`,
      format: 'table',
      generateAnswerText: () => {
        return `High-level banking summary across the three core datasets: application counts, average branch rejection rate, and total customer transaction value. [${fallbackReason}]`;
      },
    };
  }

  // Validate security guardrail on fallback SQL
  const validatedSql = validateSecurityGuardrail(match.sql);
  const data = await db.all<Record<string, unknown>>(validatedSql);
  const answerText = match.generateAnswerText(data, question);

  return {
    answerText,
    data,
    sql: validatedSql,
    format: match.format,
  };
}

// ============================================================================
// Google GenAI (@google/genai) Integration using gemini-2.5-flash
// ============================================================================

const BANKING_SCHEMA_PROMPT = `
You are the query engine for a Banking Conversational Data Analyst.
Translate the user's natural language banking question into a secure, read-only SQLite SELECT query and an informative summary.

DATABASE SCHEMA:
1. applications (
     id INTEGER PRIMARY KEY,
     month TEXT NOT NULL,          -- Format 'YYYY-MM' (e.g., '2025-01' through '2026-03')
     segment TEXT NOT NULL,        -- 'Retail', 'SME', 'Corporate', 'Wealth Management', 'Agriculture'
     count INTEGER NOT NULL,       -- Number of applications
     created_at DATETIME
   )
2. branches (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,    -- e.g. 'Metropolitan Flagship Branch', 'Downtown Financial Center'
     rejection_rate REAL NOT NULL, -- Loan rejection rate between 0.0 and 1.0 (e.g., 0.042 = 4.2%)
     created_at DATETIME
   )
3. customers (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL,           -- Corporate client or individual name
     transaction_value REAL NOT NULL, -- Cumulative transaction value (e.g. 14850250.75)
     created_at DATETIME
   )

SECURITY RULES (MANDATORY):
- Output MUST be a strictly read-only SQL query starting with SELECT or WITH.
- NEVER generate DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, TRUNCATE, or PRAGMA statements.
- Always include an appropriate LIMIT (e.g. LIMIT 15) unless calculating aggregate scalar values (SUM, AVG, COUNT).
- Use SQLite-compatible functions: ROUND(), AVG(), SUM(), COUNT(), LOWER().

JSON RESPONSE FORMAT:
You MUST respond with valid JSON matching:
{
  "sql": "SELECT ...",
  "format": "table" | "metric" | "chart",
  "expectedIntent": "brief explanation of what data is queried"
}
`;

/**
 * Executes a conversational analytical query using Google GenAI SDK (gemini-2.5-flash)
 * with automatic fallback to rule-based engine on rate limit / error.
 */
export async function processConversationalQuery(question: string): Promise<QueryResponse> {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

  // If no Gemini API key is configured, immediately execute the safe rule-based fallback
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.log('[Query Engine] GEMINI_API_KEY is not configured. Utilizing rule-based fallback engine.');
    return executeRuleBasedFallback(question, 'Rule-based fallback active (GEMINI_API_KEY unconfigured)');
  }

  try {
    console.log(`[Query Engine] Calling Gemini 2.5 Flash for question: "${question}"`);
    const ai = new GoogleGenAI({ apiKey });

    // Step 1: Generate SQL and intended visual format using gemini-2.5-flash
    const generationResult = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: BANKING_SCHEMA_PROMPT },
            { text: `User Question: "${question}"` },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = generationResult.text?.trim() || '{}';
    let parsed: { sql?: string; format?: ResultFormat; expectedIntent?: string };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Clean possible markdown code fences if response contains them
      const cleanedJson = responseText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanedJson);
    }

    if (!parsed.sql) {
      throw new Error('Gemini API did not return a valid SQL property.');
    }

    // Step 2: STRICT SECURITY GUARDRAIL CHECK on AI-generated SQL
    const validatedSql = validateSecurityGuardrail(parsed.sql);
    console.log(`[Query Engine] Validated AI SQL: ${validatedSql}`);

    // Step 3: Execute the validated query on banking.db
    const data = await db.all<Record<string, unknown>>(validatedSql);

    // Step 4: Generate conversational summary using Gemini or grounded synthesizer
    let answerText = '';
    try {
      const summaryResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an articulate Banking Conversational Data Analyst.
A banking user asked: "${question}"
The executed query was: "${validatedSql}"
The query returned the following data records:
${JSON.stringify(data.slice(0, 10), null, 2)}
Total rows returned: ${data.length}

Provide a concise, direct, professional conversational answer summarizing these banking insights.
Format financial values nicely (e.g. percentages, currency). Do NOT output markdown code blocks or JSON.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
        },
      });

      answerText = summaryResult.text?.trim() || '';
    } catch (summaryErr) {
      console.warn('[Query Engine] Could not generate secondary summary with Gemini, using data summary:', summaryErr);
      answerText = `Query executed successfully. Returned ${data.length} records answering "${question}".`;
    }

    if (!answerText) {
      answerText = `Returned ${data.length} records matching your banking query.`;
    }

    const format: ResultFormat = parsed.format || (data.length === 1 && Object.keys(data[0] || {}).length === 1 ? 'metric' : 'table');

    return {
      answerText,
      data,
      sql: validatedSql,
      format,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Query Engine Alert] Gemini API encountered issue (${errorMsg}). Switching automatically to rule-based fallback.`);
    return executeRuleBasedFallback(question, `Fallback triggered due to Gemini error: ${errorMsg}`);
  }
}

// ============================================================================
// Express API Route Handler
// ============================================================================

const router = Router();

/**
 * POST /api/query
 * Translates natural language banking questions into SQL, runs security guardrails,
 * executes query, and returns standardized JSON { answerText, data, sql, format }.
 */
router.post(
  '/',
  validateSqlGuardrailMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, sql } = req.body as QueryRequestBody;

      // Direct SQL execution pathway (if user or analyst submits raw SQL directly)
      if (sql && typeof sql === 'string') {
        const validatedSql = validateSecurityGuardrail(sql);
        const data = await db.all<Record<string, unknown>>(validatedSql);
        const format: ResultFormat =
          data.length === 1 && Object.keys(data[0] || {}).length === 1 ? 'metric' : 'table';

        res.status(200).json({
          answerText: `Executed query successfully and retrieved ${data.length} record(s).`,
          data,
          sql: validatedSql,
          format,
        } satisfies QueryResponse);
        return;
      }

      // Natural language question pathway
      if (!question || typeof question !== 'string' || question.trim() === '') {
        res.status(400).json({
          answerText: 'Please provide a banking question or natural language query in the request body.',
          data: [],
          sql: '',
          format: 'text',
        });
        return;
      }

      const result = await processConversationalQuery(question.trim());
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof SecurityGuardrailError) {
        res.status(error.statusCode).json({
          answerText: error.message,
          data: [],
          sql: req.body.sql || '',
          format: 'text',
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/query
 * Convenience endpoint for query tests via browser or query params
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const question = req.query.q as string | undefined;
    if (!question || question.trim() === '') {
      res.status(200).json({
        answerText: 'Banking Query Engine is active. Submit a POST request with { "question": "..." } or GET with ?q=...',
        data: [],
        sql: 'SELECT 1;',
        format: 'metric',
      });
      return;
    }

    const result = await processConversationalQuery(question.trim());
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
