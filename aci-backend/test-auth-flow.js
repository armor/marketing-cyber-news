const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('Testing authentication flow in detail...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Track all HTTP requests and responses
  const requests = [];
  const responses = [];

  page.on('request', request => {
    const headers = request.headers();
    requests.push({
      url: request.url(),
      method: request.method(),
      hasAuth: !!headers.authorization,
      authHeader: headers.authorization ? headers.authorization.substring(0, 20) + '...' : 'none'
    });

    if (request.url().includes('api')) {
      console.log(`📤 ${request.method()} ${request.url()}`);
      console.log(`   Auth: ${headers.authorization ? '✓ Present' : '✗ Missing'}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('api')) {
      console.log(`📥 ${status} ${url}`);

      if (url.includes('/auth/login')) {
        try {
          const body = await response.json();
          console.log(`   Response:`, JSON.stringify(body, null, 2));

          // Check if token is in response
          if (body.data && body.data.token) {
            console.log(`   ✅ Token received: ${body.data.token.substring(0, 20)}...`);
          }
        } catch (e) {
          console.log(`   Error reading response: ${e.message}`);
        }
      }

      responses.push({
        url,
        status,
        statusText: response.statusText()
      });
    }
  });

  // Console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('token') || text.includes('auth') || text.includes('login')) {
      console.log(`🖥️  Console: ${text}`);
    }
  });

  try {
    // Step 1: Navigate to login
    console.log('=== STEP 1: Navigate to Login ===');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check localStorage before login
    const localStorageBefore = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('\n📦 LocalStorage before login:', localStorageBefore);

    // Step 2: Fill and submit login
    console.log('\n=== STEP 2: Submit Login ===');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPass123!');

    console.log('Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);

    // Check localStorage after login
    const localStorageAfter = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('\n📦 LocalStorage after login:', localStorageAfter);

    // Check cookies
    const cookies = await context.cookies();
    console.log('\n🍪 Cookies:', cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));

    // Step 3: Check current page
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);

    // Step 4: Try to navigate to dashboard
    console.log('\n=== STEP 3: Navigate to Dashboard ===');
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`📍 URL after dashboard nav: ${page.url()}`);

    // Check localStorage again
    const localStorageDashboard = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('📦 LocalStorage at dashboard:', localStorageDashboard);

    // Step 5: Try to navigate to threats
    console.log('\n=== STEP 4: Navigate to Threats ===');
    await page.goto('http://localhost:5174/threats', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log(`📍 URL after threats nav: ${page.url()}`);

    // Summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('                    SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════\n');

    // Count 401s
    const unauthorizedCount = responses.filter(r => r.status === 401).length;
    console.log(`Total 401 Unauthorized responses: ${unauthorizedCount}`);

    // Count requests with auth
    const requestsWithAuth = requests.filter(r => r.url.includes('api') && r.hasAuth).length;
    const requestsWithoutAuth = requests.filter(r => r.url.includes('api') && !r.hasAuth).length;

    console.log(`\nAPI Requests:`);
    console.log(`  With Auth header: ${requestsWithAuth}`);
    console.log(`  Without Auth header: ${requestsWithoutAuth}`);

    console.log(`\nAuth Storage:`);
    console.log(`  Token in localStorage before login: ${localStorageBefore.token ? 'YES' : 'NO'}`);
    console.log(`  Token in localStorage after login: ${localStorageAfter.token ? 'YES' : 'NO'}`);
    console.log(`  Token in localStorage at dashboard: ${localStorageDashboard.token ? 'YES' : 'NO'}`);
    console.log(`  Cookies set: ${cookies.length}`);

    // Diagnosis
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   DIAGNOSIS                           ');
    console.log('═══════════════════════════════════════════════════════\n');

    if (!localStorageAfter.token) {
      console.log('❌ ISSUE: Token not saved to localStorage after login');
      console.log('   - Check userService.ts login() method');
      console.log('   - Verify token is extracted from response');
      console.log('   - Verify localStorage.setItem() is called');
    }

    if (localStorageAfter.token && requestsWithoutAuth > 0) {
      console.log('❌ ISSUE: Token in storage but not sent with requests');
      console.log('   - Check apiClient.ts request interceptor');
      console.log('   - Verify Authorization header is added');
    }

    if (unauthorizedCount > 0) {
      console.log(`❌ ISSUE: ${unauthorizedCount} requests returned 401`);
      console.log('   - API endpoints require authentication');
      console.log('   - Token not being sent or invalid');
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

testAuthFlow().catch(console.error);
