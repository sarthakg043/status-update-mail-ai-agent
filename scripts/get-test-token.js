/**
 * get-test-token.js
 *
 * Authenticates a user with email + password via Clerk's Frontend API
 * and prints a short-lived JWT you can use in Authorization: Bearer <token>
 *
 * Usage:
 *   node scripts/get-test-token.js
 *
 * Env vars required:
 *   CLERK_PUBLISHABLE_KEY   – pk_test_… or pk_live_…
 *   TEST_USER_EMAIL         – email of the test user
 *   TEST_USER_PASSWORD      – password of the test user
 */

require('dotenv').config();

const PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

if (!PUBLISHABLE_KEY || !EMAIL || !PASSWORD) {
  console.error(
    'Missing env vars. Set CLERK_PUBLISHABLE_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD in .env',
  );
  process.exit(1);
}

// Derive Frontend API URL from publishable key
// pk_test_<base64url> → decode → "clerk.<domain>$"
function getFrontendApiUrl(publishableKey) {
  const payload = publishableKey.replace(/^pk_(test|live)_/, '');
  const decoded = Buffer.from(payload, 'base64').toString('utf-8').replace(/\$$/, '');
  return `https://${decoded}`;
}

const FRONTEND_API = getFrontendApiUrl(PUBLISHABLE_KEY);

/** Parse Set-Cookie headers and return a cookie jar string */
function extractCookies(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function getToken() {
  let cookieJar = '';

  // ── Step 1: Bootstrap the dev browser (required for dev instances) ──
  // Clerk development instances require a __clerk_db_jwt cookie before
  // any sign-in attempt, obtained via /v1/dev_browser.
  const devBrowserRes = await fetch(`${FRONTEND_API}/v1/dev_browser`, {
    method: 'POST',
    headers: { 'Origin': 'http://localhost:3000' },
  });
  cookieJar = extractCookies(devBrowserRes.headers);

  if (!cookieJar.includes('__clerk_db_jwt')) {
    // Fallback: try GET /v1/dev_browser (older SDK versions)
    const devBrowserRes2 = await fetch(`${FRONTEND_API}/v1/dev_browser`, {
      headers: { 'Origin': 'http://localhost:3000', 'Cookie': cookieJar },
    });
    cookieJar += '; ' + extractCookies(devBrowserRes2.headers);
  }

  // ── Step 2: Initialise client ──────────────────────────────────────
  const clientRes = await fetch(`${FRONTEND_API}/v1/client?_is_native=1`, {
    headers: { 'Origin': 'http://localhost:3000', 'Cookie': cookieJar },
  });
  cookieJar += '; ' + extractCookies(clientRes.headers);

  // ── Step 3: Create a sign-in attempt ──────────────────────────────
  const createRes = await fetch(`${FRONTEND_API}/v1/client/sign_ins?_is_native=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:3000',
      'Cookie': cookieJar,
    },
    body: new URLSearchParams({
      identifier: EMAIL,
      strategy: 'password',
      password: PASSWORD,
    }),
  });

  cookieJar += '; ' + extractCookies(createRes.headers);
  const createData = await createRes.json();

  if (createData.errors?.length) {
    console.error('Sign-in failed:', JSON.stringify(createData.errors, null, 2));
    process.exit(1);
  }

  const signIn = createData.response;

  if (signIn.status !== 'complete') {
    console.error('Sign-in not complete. Status:', signIn.status);
    console.error(JSON.stringify(signIn, null, 2));
    process.exit(1);
  }

  const sessionId = signIn.created_session_id;
  if (!sessionId) {
    console.error('No session created. Full response:', JSON.stringify(createData, null, 2));
    process.exit(1);
  }

  // ── Step 4: Get JWT for the session ───────────────────────────────
  const tokenRes = await fetch(
    `${FRONTEND_API}/v1/client/sessions/${sessionId}/tokens?_is_native=1`,
    {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Cookie': cookieJar,
      },
    },
  );

  const tokenData = await tokenRes.json();
  const jwt = tokenData.jwt || tokenData.token;

  if (!jwt) {
    console.error('Could not extract JWT. Response:', JSON.stringify(tokenData, null, 2));
    process.exit(1);
  }

  const expiresAt = new Date((tokenData.expires_at || 0) * 1000 || Date.now() + 60_000).toISOString();

  console.log('\n✅  Session JWT (valid ~1 minute):');
  console.log('─'.repeat(80));
  console.log(jwt);
  console.log('─'.repeat(80));
  console.log(`Expires : ${expiresAt}`);
  console.log('\n📋  Ready-to-use curl commands:\n');
  console.log(`# Check identity`);
  console.log(`curl http://localhost:3000/v1/auth/me \\`);
  console.log(`  -H "Authorization: Bearer ${jwt}"\n`);
  console.log(`# List plans`);
  console.log(`curl http://localhost:3000/v1/company/plans \\`);
  console.log(`  -H "Authorization: Bearer ${jwt}"\n`);
}

getToken().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
