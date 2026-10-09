import { randInt } from './rng.js';

/**
 * Queue an event to come due in the future (因果).
 * node: where it may fire (null = wherever the event itself allows).
 * expire: days after `due` when it is dropped if it never fired.
 */
export function schedule(s, ev, minDays, maxDays = minDays, { node = null, expire = null, data = null } = {}) {
  const due = s.day + randInt(s, minDays, maxDays);
  s.sched.push({ ev, due, node, expire: expire === null ? null : due + expire, data });
}

export function unschedule(s, ev) {
  s.sched = s.sched.filter((x) => x.ev !== ev);
}

export function isScheduled(s, ev) {
  return s.sched.some((x) => x.ev === ev);
}
