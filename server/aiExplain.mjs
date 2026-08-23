import { config } from './config.mjs';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a hospital-selection reviewer for an emergency dispatch system.
You will be given a rules-based recommendation and every candidate hospital that was already
scored and vetted (unavailable/closed/full hospitals are already excluded).

Your job is NOT to invent new hospitals or use any outside knowledge. Pick ONE hospitalId from
the given candidates list — either confirm the rules-based pick or choose a different one if the
data clearly supports it — and give a short, concrete reason grounded only in the fields provided
(distanceKm, etaMinutes, readiness, score).

Respond with ONLY a JSON object, no prose, no markdown fences:
{"hospitalId": "<one of the given candidate ids>", "explanation": "<one or two plain-English sentences>"}`;

/**
 * Ask Groq to review the rules-based recommendation from ai.mjs and either
 * confirm it or override with a different (still-vetted) candidate, with a
 * natural-language explanation. Optional per the tech-stack doc — AI_API_KEY
 * unset just means this is skipped and the rules-based result stands as-is.
 *
 * Never throws: any failure (missing key, network error, bad/unparseable
 * response, or a hospitalId outside the given candidates) resolves to null,
 * and the caller falls back to the deterministic ai.mjs result untouched.
 */
export async function explainWithGroq(recommendation) {
  const apiKey = config.groqApiKey;
  if (!apiKey) return null;

  const { hospitalId, candidates } = recommendation;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const payload = {
    rulesBasedPick: hospitalId,
    candidates: candidates.map(c => ({
      hospitalId: c.hospitalId,
      hospitalName: c.hospitalName,
      distanceKm: c.distanceKm,
      etaMinutes: c.etaMinutes,
      readiness: c.readiness,
      score: c.score,
    })),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.2,
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      console.error(`Groq request failed: ${response.status} ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    // Models occasionally wrap JSON in a ```json ... ``` fence even when the
    // prompt says not to; strip it before parsing rather than treating that
    // as a bad response.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    const chosen = candidates.find(c => c.hospitalId === parsed.hospitalId);
    // If Groq names a hospitalId outside the vetted candidate list, treat it
    // as a bad response rather than trusting it — never surface an
    // unvetted/hallucinated hospital to the dispatcher.
    if (!chosen || typeof parsed.explanation !== 'string' || !parsed.explanation.trim()) return null;

    return {
      hospitalId: chosen.hospitalId,
      hospitalName: chosen.hospitalName,
      distanceKm: chosen.distanceKm,
      etaMinutes: chosen.etaMinutes,
      explanation: parsed.explanation.trim(),
      overridden: chosen.hospitalId !== hospitalId,
    };
  } catch (error) {
    console.error('Groq explanation failed, falling back to rules-based result:', error.message);
    return null;
  }
}
