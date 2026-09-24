/**
 * seed-mewacho.js — Mewacho (ምውጮ) group money collection seed
 *
 * Strictly follows how the app creates Mewacho data:
 *
 *   1. Groups created exactly as POST /api/mewacho/groups does:
 *      - INSERT into mewacho_groups (name, description, purpose, target_amount, cover_photo, created_by)
 *      - creator auto-added as 'admin' in mewacho_members
 *      - system activity logged: "Group created"
 *
 *   2. Members joined exactly as GET /groups/join/:invite_code does:
 *      - INSERT into mewacho_members (role='member')
 *      - system activity logged: "{name} joined the group"
 *
 *   3. Contributions inserted as 'confirmed' (bypassing Stripe, same as
 *      what the webhook does in POST /webhook after checkout.session.completed):
 *      - INSERT into mewacho_contributions (status='confirmed', payment_method='chapa')
 *      - activity logged: "{name} contributed {amount} ETB"
 *
 *   4. Messages logged as mewacho_activity (type='message'), same as
 *      POST /groups/:id/message
 *
 *   5. One withdrawal request per group (from admin), same as
 *      POST /groups/:id/withdraw
 *
 * What this creates:
 *   - 15 groups with Ethiopian purposes (wedding, business startup, medical, etc.)
 *   - 3–8 members per group
 *   - 2–5 confirmed contributions per group
 *   - 3–6 chat messages per group
 *   - 1 withdrawal request on completed groups
 *
 * Run: node db/seed-mewacho.js
 * Requires: seed.js must have been run first (needs existing seed users)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

// ── Mewacho group templates — Ethiopian real-world use cases ──────────────────
const GROUP_TEMPLATES = [
  {
    name:          'Abebe & Tigist Wedding Fund',
    purpose:       'wedding',
    description:   'Helping our beloved friends celebrate their special day. Every contribution counts! 💍',
    target_amount: 50000,
    messages: [
      'So happy to contribute to this wonderful couple! 🎉',
      'May your union be blessed! Sending love from Bole.',
      'We are almost at the target — let\'s keep it going! 💪',
      'Best wishes to Abebe and Tigist. ❤️',
    ],
    contribution_range: [500, 3000],
  },
  {
    name:          'Dawit\'s Medical Treatment Fund',
    purpose:       'medical',
    description:   'Our friend Dawit needs surgery. Let\'s come together as a community to help him recover.',
    target_amount: 120000,
    messages: [
      'Praying for your quick recovery Dawit. 🙏',
      'Happy to help. Wishing you strength!',
      'The community is with you. Get well soon.',
      'Every birr brings hope. Let\'s reach the target!',
      'Shared this with my friends — more contributions coming.',
    ],
    contribution_range: [1000, 10000],
  },
  {
    name:          'Yonas Business Startup Capital',
    purpose:       'business',
    description:   'Yonas is launching his tech startup in Bole. Help him get the initial equipment and office space.',
    target_amount: 200000,
    messages: [
      'Excited to support the next Ethiopian tech founder! 🚀',
      'Great initiative. Will share with the team.',
      'How is the fundraising going? Almost there!',
      'Keep it up Yonas — we believe in you! 💼',
    ],
    contribution_range: [2000, 15000],
  },
  {
    name:          'Hiwot\'s Education Fund',
    purpose:       'education',
    description:   'Supporting Hiwot to pursue her Masters degree at AAU. Education is our community\'s future.',
    target_amount: 80000,
    messages: [
      'Education changes everything. Proud to contribute.',
      'Hiwot you are going to make us all proud! 📚',
      'Shared this with my office colleagues.',
      'Almost halfway there! Let\'s finish strong. 🎓',
    ],
    contribution_range: [500, 5000],
  },
  {
    name:          'Community Water Tank — Yeka Kebele',
    purpose:       'community',
    description:   'Our neighborhood has water access issues. Together we are building a shared water tank for 50 families.',
    target_amount: 300000,
    messages: [
      'This is exactly the kind of community project we need.',
      'Clean water for everyone! Let\'s do this together. 💧',
      'My family contributed. Please share widely.',
      'Progress update: construction starts next month!',
      'Thank you all for making this possible. 🙏',
      'The kebele admin has approved the land. Great news!',
    ],
    contribution_range: [1000, 5000],
  },
  {
    name:          'Selam\'s New Baby Celebration',
    purpose:       'celebration',
    description:   'Baby shower fund for our colleague Selam. Let\'s welcome the new addition to the family! 👶',
    target_amount: 15000,
    messages: [
      'Congratulations Selam! So happy for you! 🍼',
      'Can\'t wait to meet the little one!',
      'The whole office is contributing. Much love!',
    ],
    contribution_range: [200, 1500],
  },
  {
    name:          'Merkato Sellers Association Emergency Fund',
    purpose:       'emergency',
    description:   'Emergency support fund for Merkato traders affected by the recent market incident. Quick action needed.',
    target_amount: 500000,
    messages: [
      'We stand with our Merkato brothers and sisters.',
      'Every seller should contribute what they can.',
      'The association will distribute fairly. Trust the process.',
      'Thank you to all who responded immediately! ❤️',
    ],
    contribution_range: [500, 8000],
  },
  {
    name:          'Fitsum Farewell & Gift Fund',
    purpose:       'general',
    description:   'Fitsum is relocating to Canada. Let\'s give him a memorable send-off and a meaningful gift.',
    target_amount: 25000,
    messages: [
      'We will miss you Fitsum! Safe travels! ✈️',
      'You will always be part of our team family.',
      'Contribute whatever you can — big or small!',
    ],
    contribution_range: [300, 2000],
  },
  {
    name:          'Bethlehem\'s Photography Equipment',
    purpose:       'business',
    description:   'Bethlehem is starting her photography business. Help her get a professional camera and lighting kit.',
    target_amount: 45000,
    messages: [
      'Your photos are amazing Bethlehem! You deserve this. 📸',
      'Can\'t wait to see your first professional shoot!',
      'Contributed — good luck with the business!',
      'Already halfway there in 3 days. Amazing community!',
    ],
    contribution_range: [1000, 6000],
  },
  {
    name:          'Neighborhood Mosque Renovation',
    purpose:       'religious',
    description:   'Our local mosque needs urgent roof repair. The community is coming together to restore our place of worship.',
    target_amount: 150000,
    messages: [
      'A necessary project. May Allah reward everyone who contributes.',
      'Spreading the word in our community.',
      'The imam announced this in Friday prayer — big response!',
      'Alhamdulillah, we are at 60% already.',
    ],
    contribution_range: [500, 10000],
  },
  {
    name:          'Kalkidan\'s Medical Bills',
    purpose:       'medical',
    description:   'Our neighbor Kalkidan had an unexpected accident. She has 3 children and needs community support for hospital bills.',
    target_amount: 75000,
    messages: [
      'Stay strong Kalkidan! The neighborhood is behind you.',
      'Shared this everywhere — donations are coming in.',
      'Get well soon. We are all praying for you. 🙏',
    ],
    contribution_range: [300, 5000],
  },
  {
    name:          'Nodbusiness Dev Team Lunch Fund',
    purpose:       'general',
    description:   'Monthly team lunch fund for the Nodbusiness engineering team. Good food = good code! 🍕',
    target_amount: 8000,
    messages: [
      'Finally a fund I can get behind! 😄',
      'Pizza or injera this month?',
      'Both! We deserve it after shipping v2.0.',
      'Let\'s do Yod Abyssinia — been ages!',
    ],
    contribution_range: [200, 1000],
  },
  {
    name:          'Lidya\'s Wedding Hall Deposit',
    purpose:       'wedding',
    description:   'Lidya and her fiancé need help with the hall deposit. The date is set — we just need to make it official!',
    target_amount: 30000,
    messages: [
      'So excited for you Lidya! This is happening! 💒',
      'We are covering the deposit together as family. ❤️',
      'Which hall? Sheraton? 😂',
      'Keep going team! Almost at the deposit amount!',
    ],
    contribution_range: [500, 3000],
  },
  {
    name:          'School Supplies for Orphanage Kids',
    purpose:       'charity',
    description:   'Providing notebooks, pens, and school bags for 30 children at an orphanage in Kolfe ahead of the new school year.',
    target_amount: 12000,
    messages: [
      'Every child deserves to go to school prepared.',
      'Donated in memory of my mother who loved education.',
      'The kids will be so happy. Thank you everyone!',
      'Reached the target in 2 days! ❤️ This community is amazing.',
    ],
    contribution_range: [100, 1000],
  },
  {
    name:          'Solomon\'s Car Repair Fund',
    purpose:       'emergency',
    description:   'Solomon\'s taxi, his only source of income, needs major engine repair. Help him get back to work.',
    target_amount: 35000,
    messages: [
      'Solomon helped us all so many times. Time to give back! 🚗',
      'The mechanic gave a quote — funds are almost there.',
      'Back on the road soon Solomon! We got you.',
    ],
    contribution_range: [300, 4000],
  },
];

// ── Activity messages per type ────────────────────────────────────────────────
const SYSTEM_JOIN_MESSAGES = [
  'joined the group and is ready to contribute!',
  'just joined — excited to be part of this!',
  'joined the group. Together we achieve more.',
  'is now a member. Welcome!',
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const client = await pool.connect();
  console.log('\n💰 Nodbusiness Mewacho Seed\n');
  console.log('Creates: 15 groups, members, contributions, messages, withdrawals\n');

  try {
    // ── Load existing seed users ──────────────────────────────────────────────
    console.log('👥 Loading seed users...');
    const { rows: users } = await client.query(
      `SELECT u.id, COALESCE(NULLIF(u.full_name,''), u.email) AS name
       FROM users u
       WHERE u.is_seed = TRUE AND u.email LIKE '%@nodbusiness.test'
       ORDER BY u.created_at
       LIMIT 50`
    );
    if (!users.length) {
      console.error('❌ No seed users found. Run node db/seed.js first.');
      process.exit(1);
    }
    console.log(`  ✅ Found ${users.length} seed users\n`);

    let totalGroups = 0, totalMembers = 0, totalContributions = 0;
    let totalMessages = 0, totalWithdrawals = 0;

    // ── Create each group ─────────────────────────────────────────────────────
    for (let gi = 0; gi < GROUP_TEMPLATES.length; gi++) {
      const tmpl  = GROUP_TEMPLATES[gi];
      const admin = users[gi % users.length]; // each group has a different admin

      // ── Step 1: Create group (mirrors POST /api/mewacho/groups) ──────────────
      await client.query('BEGIN');

      const { rows: [group] } = await client.query(
        `INSERT INTO mewacho_groups
           (name, description, purpose, target_amount, cover_photo, created_by, status)
         VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
        [
          tmpl.name,
          tmpl.description,
          tmpl.purpose,
          tmpl.target_amount,
          `https://picsum.photos/seed/mew${gi}${tmpl.purpose}/1200/400`,
          admin.id,
        ]
      );

      // ── Step 2: Admin becomes member (mirrors route logic) ────────────────────
      await client.query(
        `INSERT INTO mewacho_members (group_id, user_id, role)
         VALUES ($1,$2,'admin')
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [group.id, admin.id]
      );

      // ── Step 3: System activity — group created (mirrors appendActivity) ──────
      await client.query(
        `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
         VALUES ($1,$2,'system','Group created',$3)`,
        [group.id, admin.id, JSON.stringify({ purpose: tmpl.purpose })]
      );

      await client.query('COMMIT');
      totalGroups++;
      totalMembers++; // admin counts as member

      // ── Step 4: Add 3–7 more members (mirrors join via invite_code) ───────────
      const memberCount  = rand(3, 7);
      const memberOffset = (gi * 7 + 3) % users.length;
      const groupMembers = [admin]; // track for contributions

      for (let mi = 0; mi < memberCount; mi++) {
        const member = users[(memberOffset + mi) % users.length];
        if (member.id === admin.id) continue;

        await client.query('BEGIN');

        await client.query(
          `INSERT INTO mewacho_members (group_id, user_id, role)
           VALUES ($1,$2,'member')
           ON CONFLICT (group_id, user_id) DO NOTHING`,
          [group.id, member.id]
        );

        // System activity: "{name} joined the group"
        await client.query(
          `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
           VALUES ($1,$2,'system',$3,'{}')`,
          [group.id, member.id, `${member.name} ${pick(SYSTEM_JOIN_MESSAGES)}`]
        );

        await client.query('COMMIT');
        groupMembers.push(member);
        totalMembers++;
      }

      // ── Step 5: Confirmed contributions (mirrors Stripe webhook behavior) ─────
      const contribCount = rand(2, 5);
      let totalCollected = 0;

      for (let ci = 0; ci < contribCount; ci++) {
        const contributor = groupMembers[ci % groupMembers.length];
        const amount      = randF(tmpl.contribution_range[0], tmpl.contribution_range[1]);
        const isAnonymous = ci === contribCount - 1 && Math.random() > 0.7; // occasional anon

        // Insert confirmed contribution (what webhook does after Stripe checkout)
        await client.query(
          `INSERT INTO mewacho_contributions
             (group_id, user_id, amount, payment_method, status, is_anonymous,
              created_at)
           VALUES ($1,$2,$3,'chapa','confirmed',$4,
                   NOW() - ($5 || ' hours')::INTERVAL)`,
          [
            group.id,
            contributor.id,
            amount,
            isAnonymous,
            rand(1, 72), // spread over last 3 days
          ]
        );

        // Activity entry for contribution
        const displayName = isAnonymous ? 'Anonymous' : contributor.name;
        await client.query(
          `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
           VALUES ($1,$2,'contribution',$3,$4)`,
          [
            group.id,
            isAnonymous ? null : contributor.id,
            `${displayName} contributed ${amount.toLocaleString()} ETB via Chapa`,
            JSON.stringify({
              amount,
              payment_method: 'chapa',
              is_anonymous:   isAnonymous,
            }),
          ]
        );

        totalCollected += amount;
        totalContributions++;
      }

      // ── Step 6: Chat messages in the group activity feed ──────────────────────
      for (let mi = 0; mi < tmpl.messages.length; mi++) {
        const sender = groupMembers[mi % groupMembers.length];
        await client.query(
          `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata,
             created_at)
           VALUES ($1,$2,'message',$3,'{}',
                   NOW() - ($4 || ' hours')::INTERVAL)`,
          [group.id, sender.id, tmpl.messages[mi], rand(0, 48)]
        );
        totalMessages++;
      }

      // ── Step 7: One withdrawal request on groups with enough funds ────────────
      // Only for groups where total collected > 2000 (mirrors route validation)
      if (totalCollected > 2000) {
        const withdrawAmount = parseFloat((totalCollected * 0.4).toFixed(2)); // 40% of collected
        const phone = `+251 9${rand(10,99)} ${rand(100,999)} ${rand(1000,9999)}`;

        await client.query(
          `INSERT INTO mewacho_withdrawals
             (group_id, requested_by, amount, destination_type, destination_ref,
              note, requires_approval, status, approved_by)
           VALUES ($1,$2,$3,'telebirr',$4,$5,FALSE,'approved',$6)`,
          [
            group.id,
            admin.id,
            withdrawAmount,
            phone,
            `First partial withdrawal for ${tmpl.purpose} expenses.`,
            [admin.id],
          ]
        );

        // Withdrawal activity entry
        await client.query(
          `INSERT INTO mewacho_activity (group_id, user_id, type, content, metadata)
           VALUES ($1,$2,'withdrawal',$3,$4)`,
          [
            group.id,
            admin.id,
            `${admin.name} requested a withdrawal of ${withdrawAmount.toLocaleString()} ETB`,
            JSON.stringify({
              amount:           withdrawAmount,
              destination_type: 'telebirr',
              requires_approval: false,
            }),
          ]
        );

        totalWithdrawals++;
      }

      console.log(`  ✅ "${tmpl.name}" — ${groupMembers.length} members, ${contribCount} contributions, collected ${totalCollected.toFixed(0)} ETB`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log('✅ Mewacho seed complete!');
    console.log('════════════════════════════════════════');
    console.log(`  Groups:        ${totalGroups}`);
    console.log(`  Members:       ${totalMembers} (across all groups)`);
    console.log(`  Contributions: ${totalContributions} (all confirmed)`);
    console.log(`  Messages:      ${totalMessages}`);
    console.log(`  Withdrawals:   ${totalWithdrawals}`);
    console.log('');
    console.log('Browse:');
    console.log('  Frontend: https://nodbusiness.vercel.app/mewacho');
    console.log('');
    console.log('Login as any seed user to see their groups:');
    console.log('  abebe.girma0@nodbusiness.test / Test1234!');
    console.log('════════════════════════════════════════\n');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Mewacho seed failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
