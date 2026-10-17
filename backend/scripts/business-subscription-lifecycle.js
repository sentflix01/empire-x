/** Expiry notices and cleanup for paid business websites. */
const pool = require('../db/poolJsShim.cjs');
const logger = require('../lib/logger');
const { getRequiredBusinessTier } = require('../lib/builderSectionRequirements');

const DAY = 24 * 60 * 60 * 1000;
const LIFECYCLE_CHECK_INTERVAL = 15 * 60 * 1000;
const NOTICE_DAYS = [0, 3, 7, 9, 10];
/** Prepaid plans never renew themselves: remind owners this many days before the end. */
const RENEW_REMINDER_DAYS = 3;
const DRAFT_NOTICE_HOURS = [24, 48, 72];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

function buildNoticeHtml(businessName, day, subscriptionUrl) {
  const title = escapeHtml(businessName || 'your business website');
  const content = day === 0
    ? 'Your plan has ended. Renew within 24 hours to keep your website visible to customers.'
    : day === 3
      ? 'Your website is hidden from customers because the subscription is unpaid. You can still edit it; renew now to make it visible again.'
      : day === 7
        ? 'Your website is still hidden from customers. Renew to make it visible again before it is deleted on day 10.'
        : day === 9
          ? 'Final reminder: your business profile and website are scheduled for permanent deletion tomorrow if payment is not received.'
          : 'Your business profile and website have been permanently removed because the subscription remained unpaid. Your Nodbusiness account is still available.';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172033">
    <h1 style="font-size:22px">Nodbusiness subscription update</h1>
    <p>This notice is about <strong>${title}</strong>.</p><p>${content}</p>
    ${day < 10 ? `<p><a href="${escapeHtml(subscriptionUrl)}">Review your subscription</a></p>` : ''}
    <p style="color:#667085;font-size:13px">Customer purchases are paid to the business owner or its selected payment provider. Nodbusiness does not hold those customer funds.</p>
  </div>`;
}

function buildDraftNoticeHtml(draft, hours, draftUrl) {
  const title = escapeHtml(draft.title || 'your business website');
  const tier = getRequiredBusinessTier(draft.sections);
  const planName = tier === 'pro' ? 'Pro' : tier === 'premium' ? 'Premium' : tier === 'normal' ? 'Normal' : null;
  const planPriceEtb = tier === 'pro' ? 1000 : tier === 'premium' ? 500 : tier === 'normal' ? 100 : null;
  const planPriceUsd = tier === 'pro' ? 10 : tier === 'premium' ? 5 : tier === 'normal' ? 1 : null;
  const planText = planName
    ? `The sections in this draft require the <strong>${planName} plan (${planPriceEtb.toLocaleString()} ETB or USD $${planPriceUsd} per month)</strong> to publish.`
    : 'Review the sections in your draft to see which subscription plan is required to publish it.';
  const timingText = hours === 72
    ? 'This is your final reminder. The unpaid draft is now due to be deleted.'
    : `Your unpublished website draft is scheduled for deletion in about ${72 - hours} hour${72 - hours === 1 ? '' : 's'} if you do not publish it with the required subscription.`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172033">
    <h1 style="font-size:22px">Your Nodbusiness website draft</h1>
    <p>This notice is about <strong>${title}</strong>.</p>
    <p>${timingText}</p><p>${planText}</p>
    <p><a href="${escapeHtml(draftUrl)}">Review your website draft</a></p>
    <p style="color:#667085;font-size:13px">Your draft is private until you publish it.</p>
  </div>`;
}

async function sendDraftNotice(draft, hours, sendEmail) {
  const key = `draft_${hours}h`;
  const claim = await pool.query(
    `INSERT INTO showroom_draft_notices (showroom_id, notice_key)
     VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING showroom_id`,
    [draft.id, key],
  );
  if (!claim.rowCount) {
    const existing = await pool.query(
      'SELECT sent_at FROM showroom_draft_notices WHERE showroom_id=$1 AND notice_key=$2',
      [draft.id, key],
    );
    return { complete: Boolean(existing.rows[0]?.sent_at), sent: false };
  }
  try {
    const url = `${(process.env.FRONTEND_URL || 'https://nodbusiness.app').split(',')[0]}/showroom/create?edit=${encodeURIComponent(draft.id)}`;
    const subject = hours === 72
      ? `Final reminder: your ${draft.title || 'website'} draft is due to expire`
      : `Reminder: your ${draft.title || 'website'} draft expires in ${72 - hours} hours`;
    await sendEmail(draft.email, subject, buildDraftNoticeHtml(draft, hours, url));
    await pool.query(
      'UPDATE showroom_draft_notices SET sent_at=NOW() WHERE showroom_id=$1 AND notice_key=$2',
      [draft.id, key],
    );
    return { complete: true, sent: true };
  } catch (err) {
    await pool.query('DELETE FROM showroom_draft_notices WHERE showroom_id=$1 AND notice_key=$2 AND sent_at IS NULL', [draft.id, key]);
    throw err;
  }
}

async function processDraftNotices(now, sendEmail) {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.sections, s.expires_at, u.email
       FROM showrooms s
       JOIN users u ON u.id=s.owner_id
      WHERE s.status='draft' AND s.expires_at IS NOT NULL
        -- Cast: an untyped $1 + INTERVAL makes Postgres read $1 as an interval.
        AND s.expires_at <= $1::timestamptz + INTERVAL '48 hours'
      ORDER BY s.expires_at ASC`,
    [now],
  );
  let notices = 0;
  let deleted = 0;
  const send = sendEmail ?? (async (...args) => {
    const { sendCustomEmail } = await import('../utils/mailer.js');
    return sendCustomEmail(...args);
  });
  for (const draft of rows) {
    if (!draft.email) continue;
    const expiry = new Date(draft.expires_at).getTime();
    for (const hours of DRAFT_NOTICE_HOURS) {
      const dueAt = expiry - (72 - hours) * 60 * 60 * 1000;
      if (now.getTime() < dueAt) continue;
      try {
        const result = await sendDraftNotice(draft, hours, send);
        if (!result.complete) break; // Another worker has claimed this notice; wait for its result.
        if (result.sent) notices++;
      } catch (err) {
        logger.error({ err: err.message, showroomId: draft.id, noticeHours: hours }, 'Website draft reminder failed');
        break;
      }
    }
    const finalNotice = await pool.query(
      `SELECT sent_at FROM showroom_draft_notices
        WHERE showroom_id=$1 AND notice_key='draft_72h'`,
      [draft.id],
    );
    if (expiry <= now.getTime() && finalNotice.rows[0]?.sent_at) {
      const result = await pool.query("DELETE FROM showrooms WHERE id=$1 AND status='draft' AND expires_at <= $2", [draft.id, now]);
      if (result.rowCount) deleted++;
    }
  }
  return { notices, deleted };
}

function subscriptionUrl(businessId) {
  return `${(process.env.FRONTEND_URL || 'https://nodbusiness.app').split(',')[0]}/business/subscription?businessId=${encodeURIComponent(businessId)}`;
}

function formatDay(date) {
  return new Date(date).toDateString();
}

/** The in-app text for each expiry notice; it reaches owners even when email fails. */
function expiryInAppNotice(row, day) {
  const name = row.business_name || 'your business';
  const removal = formatDay(new Date(new Date(row.current_period_end).getTime() + 10 * DAY));
  if (day === 0) return { title: 'Your plan has ended', body: `${name} stays visible for 24 hours. Renew to keep it online.` };
  if (day === 3 || day === 7) return { title: 'Your website is hidden', body: `Renew ${name} to make it visible again. It will be removed on ${removal} if it stays unpaid.` };
  if (day === 9) return { title: 'Last day to renew', body: `${name} and its website will be removed tomorrow unless you renew today.` };
  return { title: 'Business profile removed', body: `${name} was removed because its plan stayed unpaid. Your Nodbusiness account is still available.` };
}

/**
 * One in-app notification per business, period and notice. Claimed in
 * business_subscription_notices under "<key>:app", separately from the email
 * claim, so a failing email is retried without repeating the notification.
 */
async function sendInAppNotice(row, key, notice) {
  const claim = await pool.query(
    `INSERT INTO business_subscription_notices (business_id, period_end, notice_key)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING business_id`,
    [row.business_id, row.current_period_end, `${key}:app`],
  );
  if (!claim.rowCount) return false;
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, 'business', $2, $3, $4)`,
    [row.owner_id, notice.title, notice.body, `/business/subscription?businessId=${row.business_id}`],
  );
  return true;
}

function buildRenewalReminderHtml(businessName, periodEnd, trial, url) {
  const title = escapeHtml(businessName || 'your business website');
  const what = trial ? 'Your free period' : 'Your plan';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172033">
    <h1 style="font-size:22px">${what} ends in ${RENEW_REMINDER_DAYS} days</h1>
    <p>${what} for <strong>${title}</strong> ends on <strong>${escapeHtml(formatDay(periodEnd))}</strong>.</p>
    <p>Plans are prepaid and never renew automatically. Pay for 1, 3, 6 or 12 more months to keep your website published.</p>
    <p><a href="${escapeHtml(url)}">Renew now</a></p>
  </div>`;
}

/** "Ends in 3 days" for paid plans and free periods alike: in-app always, email when it works. */
async function processRenewalReminders(now, sendEmail) {
  const { rows } = await pool.query(
    `SELECT b.id AS business_id, b.owner_id, b.business_name, u.email, bs.status, bs.current_period_end
       FROM business_subscriptions bs
       JOIN businesses b ON b.id = bs.business_id
       JOIN users u ON u.id = b.owner_id
      WHERE bs.tier <> 'freemium'
        AND bs.current_period_end > $1::timestamptz
        AND bs.current_period_end <= $1::timestamptz + make_interval(days => $2)
        AND bs.stripe_subscription_id IS NULL`,
    [now, RENEW_REMINDER_DAYS],
  );
  let sent = 0;
  for (const row of rows) {
    const trial = row.status === 'trialing';
    const name = row.business_name || 'your business';
    try {
      if (await sendInAppNotice(row, 'renew_3d', {
        title: trial ? 'Your free period ends soon' : 'Your plan ends soon',
        body: `${name}: ${trial ? 'the free period' : 'the plan'} ends on ${formatDay(row.current_period_end)}. Renew to keep your website published.`,
      })) sent++;
      if (!row.email) continue;
      const claim = await pool.query(
        `INSERT INTO business_subscription_notices (business_id, period_end, notice_key)
         VALUES ($1, $2, 'renew_3d') ON CONFLICT DO NOTHING RETURNING business_id`,
        [row.business_id, row.current_period_end],
      );
      if (!claim.rowCount) continue;
      const send = sendEmail || (async (...args) => (await import('../utils/mailer.js')).sendCustomEmail(...args));
      try {
        await send(row.email, `${trial ? 'Your free period' : 'Your plan'} ends in ${RENEW_REMINDER_DAYS} days: ${name}`, buildRenewalReminderHtml(row.business_name, row.current_period_end, trial, subscriptionUrl(row.business_id)));
      } catch (err) {
        await pool.query(`DELETE FROM business_subscription_notices WHERE business_id=$1 AND period_end=$2 AND notice_key='renew_3d'`, [row.business_id, row.current_period_end]);
        logger.error({ err: err.message, businessId: row.business_id }, 'Renewal reminder email failed');
      }
    } catch (err) {
      logger.error({ err: err.message, businessId: row.business_id }, 'Renewal reminder failed');
    }
  }
  return sent;
}

/**
 * Payment checks from lib/subscriptionPayments.ts (TypeScript, loaded lazily).
 * Any failure counts as "a payment may still be pending", so nothing is deleted.
 */
function paymentChecks(options) {
  if (options.payments) return options.payments;
  return {
    settlePending: async (businessId) => require('../lib/subscriptionPayments').settlePendingPayments(businessId),
    settleAbandoned: async () => require('../lib/subscriptionPayments').settleAbandonedCheckouts(),
  };
}

async function sendNotice(row, day) {
  const key = `expiry_${day}d`;
  const claim = await pool.query(
    `INSERT INTO business_subscription_notices (business_id, period_end, notice_key)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING business_id`,
    [row.business_id, row.current_period_end, key],
  );
  if (!claim.rowCount) return false;
  try {
    const { sendCustomEmail } = await import('../utils/mailer.js');
    const url = subscriptionUrl(row.business_id);
    const subject = day === 10
      ? `Business profile removed: ${row.business_name}`
      : `Subscription ${day === 0 ? 'ended' : `reminder (${day} days overdue)`}: ${row.business_name}`;
    await sendCustomEmail(row.email, subject, buildNoticeHtml(row.business_name, day, url));
    return true;
  } catch (err) {
    await pool.query('DELETE FROM business_subscription_notices WHERE business_id=$1 AND period_end=$2 AND notice_key=$3', [row.business_id, row.current_period_end, key]);
    throw err;
  }
}

async function permanentlyRemoveBusiness(row) {
  // Keep the owner's account and order snapshots. Remove the actual storefront,
  // products, and business-specific data after the final notice succeeds.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO business_creation_blocks (owner_id, blocked_until, reason)
       VALUES ($1, NOW() + INTERVAL '1 month', 'subscription_expired')
       ON CONFLICT (owner_id) DO UPDATE SET
         blocked_until = GREATEST(business_creation_blocks.blocked_until, EXCLUDED.blocked_until),
         reason = EXCLUDED.reason`,
      [row.owner_id],
    );
    await client.query('DELETE FROM products WHERE business_id=$1', [row.business_id]);
    await client.query('DELETE FROM businesses WHERE id=$1', [row.business_id]);
    const remaining = await client.query('SELECT 1 FROM businesses WHERE owner_id=$1 LIMIT 1', [row.owner_id]);
    if (!remaining.rowCount) {
      await client.query(
        `UPDATE user_profiles SET has_business_profile=FALSE,
          business_name=NULL, business_category=NULL, business_template=NULL,
          business_description=NULL, business_contact_email=NULL,
          business_contact_phone=NULL, business_address=NULL,
          business_theme_color=NULL, business_logo_url=NULL, business_cover_url=NULL,
          profile_type=CASE WHEN profile_type='business' THEN 'personal' ELSE profile_type END
         WHERE user_id=$1`,
        [row.owner_id],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

function buildLegacyGrantHtml(businessName, periodEnd, subscriptionUrl) {
  const title = escapeHtml(businessName || 'your business');
  const until = escapeHtml(new Date(periodEnd).toDateString());
  return `<p>Hello,</p>
    <p>Every NodBusiness website now belongs to a Business profile. So that your website stays online, we created the Business profile <strong>${title}</strong> for it.</p>
    <p>It is free until <strong>${until}</strong>. Choose a plan before then to keep your website published.</p>
    <p><a href="${escapeHtml(subscriptionUrl)}">Review your Business profile and plan</a></p>`;
}

/**
 * One email per Business profile that migrate59 created for a legacy website
 * (owner decision 1, 2026-10-16). Claimed through business_subscription_notices
 * so it is sent once, even with several workers.
 */
async function processLegacyGrantNotices(sendEmail) {
  const { rows } = await pool.query(
    `SELECT b.id AS business_id, b.business_name, u.email, bs.current_period_end
       FROM businesses b
       JOIN users u ON u.id = b.owner_id
       JOIN business_subscriptions bs ON bs.business_id = b.id
      WHERE b.legacy_migrated_at IS NOT NULL AND u.email IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM business_subscription_notices n
                         WHERE n.business_id = b.id AND n.notice_key = 'legacy_grant')`,
  );
  const send = sendEmail || (async (...args) => {
    const { sendCustomEmail } = await import('../utils/mailer.js');
    return sendCustomEmail(...args);
  });
  let sent = 0;
  for (const row of rows) {
    const claim = await pool.query(
      `INSERT INTO business_subscription_notices (business_id, period_end, notice_key)
       VALUES ($1, $2, 'legacy_grant') ON CONFLICT DO NOTHING RETURNING business_id`,
      [row.business_id, row.current_period_end],
    );
    if (!claim.rowCount) continue;
    try {
      const url = `${(process.env.FRONTEND_URL || 'https://nodbusiness.app').split(',')[0]}/business/subscription?businessId=${encodeURIComponent(row.business_id)}`;
      await send(row.email, `Your website now has a Business profile: ${row.business_name}`, buildLegacyGrantHtml(row.business_name, row.current_period_end, url));
      sent++;
    } catch (err) {
      await pool.query(`DELETE FROM business_subscription_notices WHERE business_id=$1 AND notice_key='legacy_grant'`, [row.business_id]);
      logger.error({ err: err.message, businessId: row.business_id }, 'Legacy Business profile email failed');
    }
  }
  return sent;
}

async function runBusinessSubscriptionLifecycle(now = new Date(), options = {}) {
  const payments = paymentChecks(options);
  // First give checkouts that never confirmed a last check with Chapa, so a
  // late payment still counts before anything below expires or is removed.
  let abandoned = { paid: 0, expired: 0 };
  try { abandoned = await payments.settleAbandoned(); } catch (err) { logger.error({ err: err.message }, 'Abandoned checkout check failed'); }
  const legacyNotices = await processLegacyGrantNotices(options.sendEmail);
  const renewalReminders = await processRenewalReminders(now, options.sendEmail);
  const { rows } = await pool.query(
    `SELECT b.id AS business_id, b.owner_id, b.business_name, u.email,
            bs.current_period_end
       FROM business_subscriptions bs
       JOIN businesses b ON b.id=bs.business_id
       JOIN users u ON u.id=b.owner_id
      WHERE bs.tier <> 'freemium'
        AND bs.current_period_end IS NOT NULL
        AND bs.current_period_end <= $1
      ORDER BY bs.current_period_end ASC`,
    [now],
  );
  let notices = 0;
  let removed = 0;
  let postponed = 0;
  for (const row of rows) {
    const daysOverdue = Math.floor((now.getTime() - new Date(row.current_period_end).getTime()) / DAY);
    if (daysOverdue >= 9) {
      // Never remove a business while a renewal may still be confirming.
      let pending;
      try { pending = await payments.settlePending(row.business_id); } catch (err) {
        logger.error({ err: err.message, businessId: row.business_id }, 'Pending payment check failed; removal postponed');
        pending = { paid: false, pending: true };
      }
      if (pending.paid) continue; // The period was extended; nothing is overdue now.
      if (pending.pending) { postponed++; continue; }
    }
    for (const day of NOTICE_DAYS) {
      if (daysOverdue < day) continue;
      try {
        // In-app first: owners see it even when email is not working.
        if (day < 10) await sendInAppNotice(row, `expiry_${day}d`, expiryInAppNotice(row, day));
        if (!row.email) continue;
        if (await sendNotice(row, day)) notices++;
        if (day === 10) {
          // Only delete after the Day 10 email was sent (or was already recorded).
          await sendInAppNotice(row, 'expiry_10d', expiryInAppNotice(row, 10));
          await permanentlyRemoveBusiness(row);
          removed++;
          break;
        }
      } catch (err) {
        logger.error({ err: err.message, businessId: row.business_id, noticeDay: day }, 'Business subscription notice failed');
        break;
      }
    }
  }
  const draftLifecycle = await processDraftNotices(now, options.sendEmail);
  const summary = {
    notices, removed, postponed, renewalReminders, legacyNotices,
    lateCheckoutsPaid: abandoned.paid, expiredCheckouts: abandoned.expired,
    draftNotices: draftLifecycle.notices, expiredDrafts: draftLifecycle.deleted,
  };
  logger.info(summary, 'Business subscription lifecycle tick complete');
  return summary;
}

function startBusinessSubscriptionLifecycle() {
  const enabled = process.env.NODE_ENV === 'production' || process.env.BUSINESS_SUBSCRIPTION_SCHEDULE_ENABLED === 'true';
  if (!enabled) return;
  const tick = () => runBusinessSubscriptionLifecycle().catch(err => logger.error({ err: err.message }, 'Business subscription lifecycle tick failed'));
  setInterval(tick, LIFECYCLE_CHECK_INTERVAL).unref();
  setTimeout(tick, 15_000).unref();
}

module.exports = { runBusinessSubscriptionLifecycle, startBusinessSubscriptionLifecycle, buildNoticeHtml, buildRenewalReminderHtml, processRenewalReminders, buildDraftNoticeHtml, buildLegacyGrantHtml, processDraftNotices, processLegacyGrantNotices };
