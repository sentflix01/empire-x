/**
 * Quick API test — verifies the profile PUT now works after migration 17
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: 'localhost', port: 3001,
      path: '/api' + path, method, headers,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n=== Nodbusiness Profile API Test ===\n');

  // 1. Login
  console.log('1. Logging in as test@nodbusiness.app...');
  const login = await request('POST', '/auth/login', { email: 'test@nodbusiness.app', password: 'Test1234!' });
  if (login.status !== 200) {
    console.error('   ❌ Login failed:', login.status, JSON.stringify(login.body));
    process.exit(1);
  }
  const token = login.body.token;
  console.log('   ✅ Logged in, token obtained');

  // 2. Get current profile
  console.log('\n2. Fetching current profile...');
  const meRes = await request('GET', '/profiles/me', null, token);
  if (meRes.status !== 200) {
    console.error('   ❌ GET /profiles/me failed:', meRes.status, JSON.stringify(meRes.body));
    process.exit(1);
  }
  const profile = meRes.body;
  console.log('   ✅ Profile found, id:', profile.id);
  console.log('   Current name:', profile.display_name);

  // 3. Update profile with all new fields
  console.log('\n3. Testing PUT /profiles/:id with full payload...');
  const payload = {
    display_name: 'Test User E2E',
    headline: 'QA Engineer · Nodbusiness',
    bio: 'This profile was edited during E2E testing.',
    location: 'Addis Ababa, Ethiopia',
    phone: '+251 911 123 456',
    website: 'https://nodbusiness.vercel.app',
    skills: JSON.stringify(['JavaScript', 'React', 'Testing']),
    languages: JSON.stringify(['English', 'Amharic']),
    experience: JSON.stringify([]),
    education: JSON.stringify([]),
    social_linkedin: 'https://linkedin.com/in/testuser',
    social_twitter: 'https://twitter.com/testuser',
    social_instagram: '',
    social_facebook: '',
    social_youtube: '',
  };
  const updateRes = await request('PUT', `/profiles/${profile.id}`, payload, token);
  if (updateRes.status === 200) {
    console.log('   ✅ Personal profile save: SUCCESS (200)');
    console.log('   Updated name:', updateRes.body.display_name);
    console.log('   Updated headline:', updateRes.body.headline);
    console.log('   social_linkedin:', updateRes.body.social_linkedin);
    console.log('   website:', updateRes.body.website);
  } else {
    console.error('   ❌ Personal profile save FAILED:', updateRes.status, JSON.stringify(updateRes.body));
  }

  // 4. Test business profile save
  console.log('\n4. Testing business profile save...');
  const bizPayload = {
    has_business_profile: true,
    business_name: 'Nodbusiness Test Business',
    business_category: 'tech',
    business_description: 'A test business created during E2E testing.',
    business_type: 'Sole Proprietorship',
    business_team_size: '2–10',
    business_founded_year: '2024',
    business_contact_email: 'business@example.com',
    business_contact_phone: '+251 922 333 444',
    business_address: 'Bole, Addis Ababa',
    business_website: 'https://business.example.com',
    business_social_linkedin: 'https://linkedin.com/company/testbiz',
    business_social_twitter: '',
    business_social_facebook: '',
    certifications: JSON.stringify([]),
    awards: JSON.stringify([]),
    services: JSON.stringify(['Web Development', 'Consulting']),
    service_areas: JSON.stringify(['Addis Ababa']),
  };
  const bizRes = await request('PUT', `/profiles/${profile.id}`, bizPayload, token);
  if (bizRes.status === 200) {
    console.log('   ✅ Business profile save: SUCCESS (200)');
    console.log('   business_name:', bizRes.body.business_name);
    console.log('   business_category:', bizRes.body.business_category);
    console.log('   has_business_profile:', bizRes.body.has_business_profile);
  } else {
    console.error('   ❌ Business profile save FAILED:', bizRes.status, JSON.stringify(bizRes.body));
  }

  // 5. Verify data persisted
  console.log('\n5. Verifying saved data persists...');
  const verify = await request('GET', '/profiles/me', null, token);
  if (verify.status === 200) {
    const v = verify.body;
    const checks = [
      ['display_name', 'Test User E2E', v.display_name],
      ['headline', 'QA Engineer · Nodbusiness', v.headline],
      ['website', 'https://nodbusiness.vercel.app', v.website],
      ['social_linkedin', 'https://linkedin.com/in/testuser', v.social_linkedin],
      ['business_name', 'Nodbusiness Test Business', v.business_name],
      ['has_business_profile', true, v.has_business_profile],
    ];
    let allPass = true;
    for (const [field, expected, actual] of checks) {
      const pass = actual === expected || String(actual) === String(expected);
      console.log(`   ${pass ? '✅' : '❌'} ${field}: ${actual}`);
      if (!pass) allPass = false;
    }
    console.log(allPass ? '\n✅ All checks passed — profile save works!' : '\n❌ Some checks failed');
  } else {
    console.error('   ❌ Verification fetch failed:', verify.status);
  }

  // 6. Test upload endpoint
  console.log('\n6. Testing upload endpoint...');
  const uploadRes = await request('POST', '/upload', null, token);
  console.log('   Upload endpoint status:', uploadRes.status, '—', JSON.stringify(uploadRes.body).substring(0, 80));

  console.log('\n=== Test Complete ===\n');
  process.exit(0);
})();
