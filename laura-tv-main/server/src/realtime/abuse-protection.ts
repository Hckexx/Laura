import { cowatchConfig } from './config.js';

type Attempt = { count: number; windowStartedAt: number; violations: number };

export class CowatchAbuseProtection {
  private readonly attempts = new Map<string, Attempt>();
  private readonly bans = new Map<string, number>();
  private readonly chatAttempts = new Map<string, { count: number; windowStartedAt: number }>();
  private readonly eventAttempts = new Map<string, { count: number; windowStartedAt: number }>();

  isBlocked(ip: string) {
    const until = this.bans.get(ip);
    if (!until) return false;
    if (until > Date.now()) return true;
    this.bans.delete(ip);
    return false;
  }

  consume(ip: string, action: 'create' | 'join') {
    if (this.isBlocked(ip)) return { allowed: false, blocked: true };
    const now = Date.now();
    const windowMs = action === 'create'
      ? cowatchConfig.abuseProtection.createWindowMs
      : cowatchConfig.abuseProtection.joinWindowMs;
    const limit = action === 'create'
      ? cowatchConfig.abuseProtection.maxCreatesPerWindow
      : cowatchConfig.abuseProtection.maxJoinsPerWindow;
    const key = `${ip}:${action}`;
    let attempt = this.attempts.get(key);
    if (!attempt || now - attempt.windowStartedAt >= windowMs) {
      attempt = { count: 0, windowStartedAt: now, violations: attempt?.violations ?? 0 };
    }
    attempt.count += 1;
    if (attempt.count > limit) attempt.violations += 1;
    this.attempts.set(key, attempt);
    if (attempt.violations >= cowatchConfig.abuseProtection.extremeViolationsBeforeBan) {
      this.bans.set(ip, now + cowatchConfig.abuseProtection.temporaryBanMs);
      this.attempts.delete(key);
      return { allowed: false, blocked: true };
    }
    return { allowed: attempt.count <= limit, blocked: false };
  }

  recordMalformed(ip: string) {
    const key = `${ip}:malformed`;
    const now = Date.now();
    const attempt = this.attempts.get(key) ?? { count: 0, windowStartedAt: now, violations: 0 };
    if (now - attempt.windowStartedAt >= 60_000) {
      attempt.count = 0;
      attempt.violations = 0;
      attempt.windowStartedAt = now;
    }
    attempt.count += 1;
    if (attempt.count > 25) attempt.violations += 1;
    this.attempts.set(key, attempt);
    if (attempt.violations >= cowatchConfig.abuseProtection.extremeViolationsBeforeBan) {
      this.bans.set(ip, now + cowatchConfig.abuseProtection.temporaryBanMs);
      this.attempts.delete(key);
    }
  }

  consumeChat(participantId: string) {
    const now = Date.now();
    let attempt = this.chatAttempts.get(participantId);
    if (!attempt || now - attempt.windowStartedAt >= cowatchConfig.chat.throttleWindowMs) {
      attempt = { count: 0, windowStartedAt: now };
    }
    attempt.count += 1;
    this.chatAttempts.set(participantId, attempt);
    return attempt.count <= cowatchConfig.chat.maxMessagesPerWindow;
  }

  consumeEvent(ip: string, socketId: string) {
    if (this.isBlocked(ip)) return { allowed: false, blocked: true };
    const now = Date.now();
    const key = `${ip}:${socketId}`;
    let attempt = this.eventAttempts.get(key);
    if (!attempt || now - attempt.windowStartedAt >= cowatchConfig.abuseProtection.eventWindowMs) {
      attempt = { count: 0, windowStartedAt: now };
    }
    attempt.count += 1;
    this.eventAttempts.set(key, attempt);
    if (attempt.count > cowatchConfig.abuseProtection.extremeEventsPerWindow) {
      this.bans.set(ip, now + cowatchConfig.abuseProtection.temporaryBanMs);
      this.eventAttempts.delete(key);
      return { allowed: false, blocked: true };
    }
    return { allowed: attempt.count <= cowatchConfig.abuseProtection.maxEventsPerWindow, blocked: false };
  }

  clearSocket(socketId: string) {
    for (const key of this.eventAttempts.keys()) {
      if (key.endsWith(`:${socketId}`)) this.eventAttempts.delete(key);
    }
  }
}
