'use strict';

/**
 * Every migration re-runs on each deploy. One that rebuilds orders_status_check
 * with an older, shorter list fails the deploy as soon as any order uses a newer
 * status (for example 'shipped' or 'awaiting_payment'). All of them must build
 * the constraint from db/orderStatuses.js.
 */
const fs = require('fs');
const path = require('path');
const { ORDER_STATUSES, orderStatusCheckSql } = require('../../db/orderStatuses');

const dbDir = path.join(__dirname, '../../db');
const migrations = fs.readdirSync(dbDir).filter((f) => /^migrate\d*\.js$/.test(f));

describe('orders.status constraint across migrations', () => {
  it('every migration that adds orders_status_check uses the shared list', () => {
    const offenders = migrations.filter((file) => {
      const source = fs.readFileSync(path.join(dbDir, file), 'latin1');
      return /ADD CONSTRAINT orders_status_check/i.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('the shared list covers every status the app writes', () => {
    for (const status of ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled',
      'awaiting_payment', 'payment_reported', 'expired', 'return_requested', 'return_approved']) {
      expect(ORDER_STATUSES).toContain(status);
    }
    expect(orderStatusCheckSql()).toContain("'awaiting_payment','payment_reported','expired'");
  });
});
