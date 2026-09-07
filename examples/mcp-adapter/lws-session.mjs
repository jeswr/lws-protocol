import { open, constants } from 'node:fs/promises';

const EXCHANGE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ACCESS_TOKEN = 'urn:ietf:params:oauth:token-type:access_token';

export class LwsError extends Error {}

export async function loadBootstrap(path) {
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.size > 65536) {
      throw new LwsError('Bootstrap must be a private regular file of at most 64 KiB.');
    }
    return JSON.parse(await file.readFile('utf8'));
  } finally {
    await file.close();
  }
}

function checkedUrl(value) {
  const url = new URL(value);
  // This runnable experiment is deliberately limited to a local test estate.
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
      url.username || url.password || url.hash) {
    throw new LwsError('The experiment requires explicit loopback URLs.');
  }
  return url;
}

async function readLimited(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new LwsError('Response exceeds the experiment limit.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export class LwsSession {
  #configuration;
  #fetch;
  #now;
  #token;
  #expires = 0;
  #pending;

  constructor(configuration, { fetchImpl = fetch, now = Date.now } = {}) {
    this.#configuration = { ...configuration };
    const issuer = checkedUrl(configuration.issuer);
    const metadata = checkedUrl(configuration.metadata_url);
    const endpoint = checkedUrl(configuration.token_endpoint);
    const resource = checkedUrl(configuration.resource_url);
    const base = checkedUrl(configuration.native_base_url);
    checkedUrl(configuration.realm);
    if (metadata.origin !== issuer.origin || endpoint.origin !== issuer.origin ||
        resource.origin !== base.origin) throw new LwsError('Unexpected endpoint origin.');
    for (const key of ['client_id', 'client_secret', 'subject_token', 'subject_token_type']) {
      if (typeof configuration[key] !== 'string' || !configuration[key]) throw new LwsError('Incomplete credential configuration.');
    }
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  async #request(url, options = {}) {
    try {
      return await this.#fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(5000) });
    } catch { throw new LwsError('Configured LWS endpoint could not be reached.'); }
  }

  async #exchange() {
    const c = this.#configuration;
    const response = await this.#request(c.metadata_url, { headers: { Accept: 'application/json' } });
    if (!response.ok) { await response.body?.cancel(); throw new LwsError('Authorization metadata unavailable.'); }
    const metadata = JSON.parse(await readLimited(response));
    if (metadata.issuer !== c.issuer || metadata.token_endpoint !== c.token_endpoint ||
        !metadata.grant_types_supported?.includes(EXCHANGE) ||
        !metadata.subject_token_types_supported?.includes(c.subject_token_type)) {
      throw new LwsError('Authorization metadata does not match the configured trust and suite.');
    }
    const result = await this.#request(c.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: EXCHANGE, resource: c.realm,
        subject_token: c.subject_token, subject_token_type: c.subject_token_type,
        client_id: c.client_id, client_secret: c.client_secret }),
    });
    if (!result.ok) { await result.body?.cancel(); throw new LwsError(`Credential exchange failed (${result.status}).`); }
    const token = JSON.parse(await readLimited(result));
    if (typeof token.access_token !== 'string' || !token.access_token || /[\r\n]/.test(token.access_token) ||
        String(token.token_type).toLowerCase() !== 'bearer' || token.issued_token_type !== ACCESS_TOKEN ||
        !Number.isInteger(token.expires_in) || token.expires_in <= 0 || token.expires_in > 86400) {
      throw new LwsError('Unsupported token response.');
    }
    this.#token = token.access_token;
    this.#expires = this.#now() + Math.max(0, token.expires_in - 5) * 1000;
    return this.#token;
  }

  async #accessToken() {
    if (this.#token && this.#now() < this.#expires) return this.#token;
    if (!this.#pending) this.#pending = this.#exchange().finally(() => { this.#pending = undefined; });
    return this.#pending;
  }

  async read() {
    // There is intentionally no model-controlled URL, audience, credential, or actor argument.
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.#accessToken();
      const response = await this.#request(this.#configuration.resource_url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/turtle, application/ld+json, text/plain;q=0.5' },
      });
      if (response.status === 401 && attempt === 0) {
        await response.body?.cancel(); this.#token = undefined; continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new LwsError(`Storage request denied (${response.status}).`); }
      return { text: await readLimited(response), mediaType: response.headers.get('content-type') };
    }
    throw new LwsError('Storage rejected refreshed credentials.');
  }
}
