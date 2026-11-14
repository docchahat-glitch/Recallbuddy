/* Recall Buddy server (Cloudflare Pages, "advanced mode" _worker.js). Deployed together with the website folder.

   What it protects
   - The full app is stored ENCRYPTED (full.enc). Only this server knows the key (secret FULL_KEY), and it hands the key
     only to a device that sends a valid, not-revoked, not-expired activation code made for that device.
   - Every code you issue is recorded here, so you can REVOKE it, see who has access, and block a phone number.
   - Screenshot strikes are counted here, so clearing browser data does not reset them.
   - Expiry is checked with the server's clock, not the phone's.

   Settings in Cloudflare (Pages project > Settings):
     KV namespace binding:  RB
     Secrets:  LICENSE_PRIVATE_JWK  (from the owner pack), FULL_KEY (from the owner pack), ADMIN_PASSWORD (choose one)
*/
const enc = new TextEncoder(), dec = new TextDecoder();
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);   // India date
const PLANS = { p50: 'Starter', p100: 'Plus', p150: 'Pro' };
const OWNER_WA = '918384014798';

async function keys(env) {
  const jwk = JSON.parse(env.LICENSE_PRIVATE_JWK);
  const priv = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return { priv, pub };
}
async function idOf(code) { const h = await crypto.subtle.digest('SHA-256', enc.encode(code)); return [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''); }
async function readCode(env, code) {
  code = String(code || '').replace(/\s+/g, ''); const p = code.split('.'); if (p.length !== 2) return null;
  const { pub } = await keys(env);
  let ok = false; try { ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64u(p[1]), enc.encode(p[0])); } catch (e) { }
  if (!ok) return null;
  try { return { code, pl: JSON.parse(dec.decode(unb64u(p[0]))), id: await idOf(code) }; } catch (e) { return null; }
}
async function sign(env, payload) {
  const { priv } = await keys(env);
  const p = b64u(enc.encode(JSON.stringify(payload)));
  const s = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, enc.encode(p));
  return p + '.' + b64u(s);
}
const getJ = async (env, k) => { const v = await env.RB.get(k); return v ? JSON.parse(v) : null; };
const putJ = (env, k, v, meta) => env.RB.put(k, JSON.stringify(v), meta ? { metadata: meta } : undefined);

/* ---------------- student endpoints ---------------- */
async function unlock(env, body) {
  const c = await readCode(env, body.code); if (!c) return J({ ok: false, why: 'This code is not valid.' });
  const pl = c.pl, dev = String(body.device || '');
  if (pl.role === 'owner') {
    const r = await getJ(env, 'code:' + c.id); if (!r || r.revoked) return J({ ok: false, why: 'This owner code is not active.' });
    if (pl.e && pl.e < today()) return J({ ok: false, why: 'This owner code has expired.' });
    return J({ ok: true, key: env.FULL_KEY, owner: true });
  }
  const rec = await getJ(env, 'code:' + c.id);
  if (!rec) return J({ ok: false, why: 'This code is not registered. Please contact us.' });
  if (rec.revoked) return J({ ok: false, revoked: true, why: 'This code has been switched off. Please contact us.' });
  if ([].concat(pl.d || []).indexOf(dev) < 0) return J({ ok: false, why: 'This code was made for a different device.' });
  if (pl.e && pl.e < today()) return J({ ok: false, expired: true, why: 'Your access expired on ' + pl.e + '. Renew to continue.' });
  const bl = await getJ(env, 'block:' + pl.p);
  if (bl) {
    if ((rec.issued || 0) > bl.at && !bl.permanent) { await env.RB.delete('block:' + pl.p); await env.RB.delete('strike:' + pl.p); }
    else return J({ ok: false, blocked: true, why: 'This account was deactivated' + (bl.reason ? ' (' + bl.reason + ')' : '') + '. Contact us on WhatsApp.' });
  }
  rec.seen = rec.seen || {}; rec.seen[dev] = new Date().toISOString(); await putJ(env, 'code:' + c.id, rec, meta(rec));
  return J({ ok: true, key: env.FULL_KEY, exp: pl.e, plan: pl.l });
}
async function strike(env, body) {
  const c = await readCode(env, body.code); if (!c || c.pl.role === 'owner') return J({ ok: true, strikes: 0 });
  const ph = c.pl.p, k = 'strike:' + ph, n = ((await getJ(env, k)) || 0) + 1;
  await putJ(env, k, n);
  if (n >= 2) { await putJ(env, 'block:' + ph, { at: Date.now(), reason: 'screenshots', device: body.device || '', name: (await getJ(env, 'code:' + c.id) || {}).name || '' }); return J({ ok: true, strikes: n, blocked: true }); }
  return J({ ok: true, strikes: n });
}

/* ---------------- owner (admin) endpoints ---------------- */
const meta = r => ({ name: (r.name || '').slice(0, 40), phone: r.phone, plan: r.plan, exp: r.exp, issued: r.issued, revoked: !!r.revoked, owner: !!r.owner, devices: (r.devices || []).join(',') });
async function adminOK(env, req, body) {
  const ip = req.headers.get('cf-connecting-ip') || 'x', fk = 'adminfail:' + ip, fails = (await getJ(env, fk)) || 0;
  if (fails >= 10) return 'Too many wrong passwords. Try again in an hour.';
  const a = enc.encode(String(body.pw || '')), b = enc.encode(String(env.ADMIN_PASSWORD || ''));
  let same = a.length === b.length && b.length >= 8; for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) same = false;
  if (!same) { await env.RB.put(fk, String(fails + 1), { expirationTtl: 3600 }); return 'Wrong password.'; }
  return '';
}
function addDays(n) { const d = new Date(Date.now() + 5.5 * 3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
async function admin(env, req, path, body) {
  const bad = await adminOK(env, req, body); if (bad) return J({ ok: false, why: bad }, 401);
  if (path === 'check') return J({ ok: true });
  if (path === 'issue') {
    const owner = !!body.owner, days = Math.max(1, Math.min(3650, +body.days || 30)), exp = body.until && /^\d{4}-\d{2}-\d{2}$/.test(body.until) ? body.until : addDays(days);
    if (owner) {
      const code = await sign(env, { v: 1, role: 'owner', e: exp, i: Date.now() }), id = await idOf(code), rec = { owner: true, name: body.name || 'Owner', phone: '', plan: 'owner', exp, issued: Date.now(), devices: [] };
      await putJ(env, 'code:' + id, rec, meta(rec)); return J({ ok: true, id, code, exp });
    }
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return J({ ok: false, why: 'Enter the student\'s 10-digit WhatsApp number.' });
    const devices = [].concat(body.devices || []).map(d => String(d).toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean);
    if (!devices.length || devices.some(d => d.length !== 8)) return J({ ok: false, why: 'Each Device ID has 8 letters/numbers, like ABCD-EFGH.' });
    if (devices.length > 2) return J({ ok: false, why: 'At most 2 devices (a phone and a tablet).' });
    const plan = PLANS[body.plan] ? body.plan : 'p100';
    const bl = await getJ(env, 'block:' + phone);
    if (bl && bl.permanent && !body.reinstate) return J({ ok: false, blacklisted: true, why: '+91 ' + phone + ' is blacklisted' + (bl.reason ? ' (' + bl.reason + ')' : '') + '. Tick "Give another chance" to issue anyway.' });
    if (bl && body.reinstate) { await env.RB.delete('block:' + phone); await env.RB.delete('strike:' + phone); }
    const issued = Date.now(), code = await sign(env, { v: 1, p: phone, d: devices.length === 1 ? devices[0] : devices, l: plan, e: exp, i: issued }), id = await idOf(code);
    const rec = { name: String(body.name || '').slice(0, 60), phone, devices, plan, exp, issued, note: String(body.note || '').slice(0, 200) };
    await putJ(env, 'code:' + id, rec, meta(rec));
    const msg = 'Hi ' + (rec.name || '') + ', your Recall Buddy ' + PLANS[plan] + ' access is ready (valid until ' + exp + ').\n\nOpen Recall Buddy > Get full access > step 4, paste this activation code and tap Activate:\n\n' + code + '\n\nIt works only on your registered device(s). Please do not share it.';
    return J({ ok: true, id, code, exp, wa: 'https://wa.me/91' + phone + '?text=' + encodeURIComponent(msg) });
  }
  if (path === 'list') {
    const out = []; let cursor;
    do { const r = await env.RB.list({ prefix: 'code:', cursor }); r.keys.forEach(k => out.push(Object.assign({ id: k.name.slice(5) }, k.metadata || {}))); cursor = r.list_complete ? null : r.cursor; } while (cursor);
    const blocks = []; let c2;
    do { const r = await env.RB.list({ prefix: 'block:', cursor: c2 }); for (const k of r.keys) blocks.push(Object.assign({ phone: k.name.slice(6) }, await getJ(env, k.name))); c2 = r.list_complete ? null : r.cursor; } while (c2);
    out.sort((a, b) => (b.issued || 0) - (a.issued || 0));
    return J({ ok: true, codes: out, blocks, today: today() });
  }
  if (path === 'revoke' || path === 'restore') {
    const rec = await getJ(env, 'code:' + body.id); if (!rec) return J({ ok: false, why: 'Not found.' });
    rec.revoked = path === 'revoke'; await putJ(env, 'code:' + body.id, rec, meta(rec)); return J({ ok: true });
  }
  if (path === 'block') {
    const ph = String(body.phone || '').replace(/\D/g, '').slice(-10); if (ph.length !== 10) return J({ ok: false, why: '10-digit number needed.' });
    await putJ(env, 'block:' + ph, { at: Date.now(), reason: String(body.reason || 'blocked by owner').slice(0, 100), permanent: true }); return J({ ok: true });
  }
  if (path === 'unblock') { const ph = String(body.phone || '').replace(/\D/g, '').slice(-10); await env.RB.delete('block:' + ph); await env.RB.delete('strike:' + ph); return J({ ok: true }); }
  return J({ ok: false, why: 'Unknown action.' }, 404);
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname;
    if (p.startsWith('/api/')) {
      if (req.method !== 'POST') return J({ ok: false, why: 'POST only' }, 405);
      if (!env.RB || !env.LICENSE_PRIVATE_JWK || !env.FULL_KEY) return J({ ok: false, why: 'Server is not set up yet (KV binding RB or secrets missing).' }, 500);
      let body = {}; try { body = await req.json(); } catch (e) { }
      try {
        if (p === '/api/unlock') return await unlock(env, body);
        if (p === '/api/strike') return await strike(env, body);
        if (p.startsWith('/api/admin/')) return await admin(env, req, p.slice(11), body);
      } catch (e) { return J({ ok: false, why: 'Server error.' }, 500); }
      return J({ ok: false, why: 'Not found' }, 404);
    }
    if (p === '/admin' || p === '/admin/') return env.ASSETS.fetch(new Request(new URL('/admin.html', u), req));
    if (p === '/_worker.js' || p.startsWith('/js/full.js')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(req);
  }
};
