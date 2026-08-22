import { config } from './config.mjs';

let runtimeApiKey = '';

export function getTomTomApiKey() {
  return runtimeApiKey || config.tomtomApiKey;
}

export function setTomTomApiKey(apiKey) {
  runtimeApiKey = apiKey.trim();
}

export async function proxyTomTom(path, query) {
  const apiKey = getTomTomApiKey();
  if (!apiKey) {
    const error = new Error('TomTom API key is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const target = new URL(`https://api.tomtom.com${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' && value) target.searchParams.set(key, value);
  }
  target.searchParams.set('key', apiKey);

  const response = await fetch(target);
  const payload = await response.text();
  return { status: response.status, contentType: response.headers.get('content-type') || 'application/json', payload };
}