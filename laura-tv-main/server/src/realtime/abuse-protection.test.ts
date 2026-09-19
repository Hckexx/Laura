import assert from 'node:assert/strict';
import test from 'node:test';
import { CowatchAbuseProtection } from './abuse-protection.js';
import { cowatchConfig } from './config.js';

test('throttles ordinary Cowatch event floods and temporarily blocks extreme floods', () => {
  const abuse = new CowatchAbuseProtection();
  const ip = '192.0.2.10';
  let result = { allowed: true, blocked: false };
  for (let count = 0; count <= cowatchConfig.abuseProtection.maxEventsPerWindow; count += 1) {
    result = abuse.consumeEvent(ip, 'socket-one');
  }
  assert.deepEqual(result, { allowed: false, blocked: false });

  for (let count = cowatchConfig.abuseProtection.maxEventsPerWindow + 1; count <= cowatchConfig.abuseProtection.extremeEventsPerWindow; count += 1) {
    result = abuse.consumeEvent(ip, 'socket-one');
  }
  assert.deepEqual(result, { allowed: false, blocked: true });
  assert.equal(abuse.isBlocked(ip), true);
});
