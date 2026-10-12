import type { APIRoute } from 'astro';
import { answerQuestion, isLanguage, type Language } from '../../lib/architect';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DEFAULT_LANGUAGE: Language = 'pl';
const MAX_QUESTION_LENGTH = 2000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: CORS });

/** POST /api/ask — { question: string, language?: 'pl'|'en'|'de'|'ja' } */
export const POST: APIRoute = async ({ request }) => {
  let payload: { question?: unknown; language?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(
      { error: 'InvalidRequest', message: 'Body must be valid JSON: { question, language }.' },
      400,
    );
  }
  return handle(payload.question, payload.language);
};

/** GET /api/ask?q=...&language=pl — same logic, for easy curl/exploration. */
export const GET: APIRoute = ({ url }) => {
  return handle(url.searchParams.get('q'), url.searchParams.get('language'));
};

function handle(rawQuestion: unknown, rawLanguage: unknown): Response {
  const question = typeof rawQuestion === 'string' ? rawQuestion.trim() : '';
  if (!question) {
    return json(
      { error: 'MissingQuestion', message: 'Provide a non-empty question.' },
      400,
    );
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return json(
      { error: 'QuestionTooLong', message: `Question exceeds ${MAX_QUESTION_LENGTH} characters.` },
      400,
    );
  }

  const language: Language = isLanguage(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;

  return json(answerQuestion(question, language));
}
