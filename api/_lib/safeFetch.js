// Fetching a page someone pasted, without letting the link reach anything private.
//
// The recipe reader and the photo pass-through fetch whatever address a visitor sends. Without care
// that could be pointed at the server's own network (http://localhost, 10.x, the cloud metadata
// address 169.254.169.254 …). So every hop, including each redirect, must be a public address on
// the normal web ports, and the answer is cut off once it gets too big.
import { lookup } from 'node:dns/promises';
import net from 'node:net';

// Identify honestly. Sites that refuse automated requests get the
// "fill it in by hand" fallback rather than a workaround.
export const UA = 'RecipeRolodex/0.2 (personal recipe box; reads schema.org recipe data)';
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12000;

function v4Private(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 || // this network, private, loopback, multicast/reserved
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local (cloud metadata lives here)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) // benchmarking
  );
}

function isPrivate(ip) {
  if (net.isIPv4(ip)) return v4Private(ip);
  const v6 = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return v4Private(mapped[1]);
  return (
    v6 === '::' || v6 === '::1' ||
    v6.startsWith('fc') || v6.startsWith('fd') || // unique local
    /^fe[89ab]/.test(v6) || // link-local
    v6.startsWith('ff') // multicast
  );
}

async function assertPublic(url) {
  if (!/^https?:$/.test(url.protocol)) throw new Error('only web links can be read');
  if (url.username || url.password) throw new Error('links with a login in them can’t be read');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('that link uses an unusual port');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('that address isn’t on the public web');
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isPrivate(a.address))) throw new Error('that address isn’t on the public web');
}

async function readCapped(res, maxBytes) {
  const declared = Number(res.headers.get('content-length'));
  if (declared && declared > maxBytes) throw new Error('the page is too large');
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error('the page is too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches a public web address and returns { res, bytes, url } (url is where it ended up after
 * redirects). Throws with a short reason when the address isn't public, or the answer is too big.
 */
export async function safeFetch(input, { headers = {}, maxBytes }) {
  let url = new URL(input);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, redirect: 'manual', signal });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel().catch(() => {});
      url = new URL(location, url);
      continue;
    }
    return { res, url, bytes: await readCapped(res, maxBytes) };
  }
  throw new Error('the link redirects too many times');
}
