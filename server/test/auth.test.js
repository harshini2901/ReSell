/**
 * Phase 1 integration test — auth endpoints.
 * Uses mongodb-memory-server so no real Atlas connection is needed.
 * Run with:  node test/auth.test.js
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');

process.env.JWT_SECRET = 'test_secret_for_phase1';
process.env.CLIENT_URL = 'http://localhost:5173';

const app = require('../index_test'); // a test-friendly version of the app (no listen)

let mongod;
let server;
let BASE;

// ── Helpers ───────────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
async function run() {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Start Express on a random port
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  BASE = `http://localhost:${server.address().port}`;
  console.log(`\nTest server on port ${server.address().port}\n`);

  // ── 1. Health check ─────────────────────────────────────────────────────────
  console.log('GET /');
  const health = await request('GET', '/');
  assert('Returns 200', health.status === 200);
  assert('Body has message', health.body.message === 'ReSell API is running');

  // ── 2. check-email — non-existent ──────────────────────────────────────────
  console.log('\nPOST /api/auth/check-email (no account)');
  const ce1 = await request('POST', '/api/auth/check-email', { email: 'test@resell.com' });
  assert('Returns 200', ce1.status === 200);
  assert('exists = false', ce1.body.exists === false);

  // ── 3. Register ────────────────────────────────────────────────────────────
  console.log('\nPOST /api/auth/register');
  const reg = await request('POST', '/api/auth/register', {
    name: 'Test User', email: 'test@resell.com', password: 'secret123',
  });
  assert('Returns 201', reg.status === 201);
  assert('Has token', typeof reg.body.token === 'string');
  assert('Has user.name', reg.body.user?.name === 'Test User');
  assert('Has user.email', reg.body.user?.email === 'test@resell.com');
  assert('No passwordHash in response', !reg.body.user?.passwordHash);
  const token = reg.body.token;

  // ── 4. Duplicate register ──────────────────────────────────────────────────
  console.log('\nPOST /api/auth/register (duplicate email)');
  const dup = await request('POST', '/api/auth/register', {
    name: 'Test User 2', email: 'test@resell.com', password: 'secret123',
  });
  assert('Returns 409', dup.status === 409);

  // ── 5. check-email — now exists ────────────────────────────────────────────
  console.log('\nPOST /api/auth/check-email (account exists)');
  const ce2 = await request('POST', '/api/auth/check-email', { email: 'test@resell.com' });
  assert('exists = true', ce2.body.exists === true);

  // ── 6. Login — correct password ────────────────────────────────────────────
  console.log('\nPOST /api/auth/login (correct credentials)');
  const login = await request('POST', '/api/auth/login', {
    email: 'test@resell.com', password: 'secret123',
  });
  assert('Returns 200', login.status === 200);
  assert('Has token', typeof login.body.token === 'string');
  assert('No passwordHash', !login.body.user?.passwordHash);

  // ── 7. Login — wrong password ──────────────────────────────────────────────
  console.log('\nPOST /api/auth/login (wrong password)');
  const badLogin = await request('POST', '/api/auth/login', {
    email: 'test@resell.com', password: 'wrongpassword',
  });
  assert('Returns 401', badLogin.status === 401);

  // ── 8. Profile — authenticated ─────────────────────────────────────────────
  console.log('\nGET /api/auth/profile (with valid token)');
  const profile = await request('GET', '/api/auth/profile', null, token);
  assert('Returns 200', profile.status === 200);
  assert('Has user.email', profile.body.user?.email === 'test@resell.com');
  assert('No passwordHash', !profile.body.user?.passwordHash);

  // ── 9. Profile — no token ──────────────────────────────────────────────────
  console.log('\nGET /api/auth/profile (no token)');
  const noAuth = await request('GET', '/api/auth/profile');
  assert('Returns 401', noAuth.status === 401);

  // ── 10. Profile — bad token ────────────────────────────────────────────────
  console.log('\nGET /api/auth/profile (invalid token)');
  const badToken = await request('GET', '/api/auth/profile', null, 'Bearer bad.token.here');
  assert('Returns 401', badToken.status === 401);

  // ── Short password validation ──────────────────────────────────────────────
  console.log('\nPOST /api/auth/register (short password)');
  const shortPw = await request('POST', '/api/auth/register', {
    name: 'X', email: 'x@x.com', password: '123',
  });
  assert('Returns 400', shortPw.status === 400);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────`);
  console.log(`Tests: ${passed + failed} | ✅ ${passed} passed | ❌ ${failed} failed`);

  await mongoose.disconnect();
  await mongod.stop();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
