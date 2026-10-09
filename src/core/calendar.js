// 天元曆: 12 months × 30 days. Day 0 is 天元 3012 年 正月初一.

export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 360;
export const START_YEAR = 3012;

const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function cnNum(n) {
  n = Math.floor(n);
  if (n <= 10) return DIGITS[n];
  if (n < 20) return '十' + DIGITS[n - 10];
  if (n < 100) return DIGITS[Math.floor(n / 10)] + '十' + (n % 10 ? DIGITS[n % 10] : '');
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    if (!rest) return DIGITS[h] + '百';
    return DIGITS[h] + '百' + (rest < 10 ? '零' + DIGITS[rest] : (rest < 20 ? '一' : '') + cnNum(rest));
  }
  return String(n);
}

function dayName(d) {
  if (d <= 10) return '初' + DIGITS[d];
  if (d < 20) return '十' + DIGITS[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + DIGITS[d - 20];
  return '三十';
}

export function dateOf(day) {
  const year = START_YEAR + Math.floor(day / DAYS_PER_YEAR);
  const inYear = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const month = Math.floor(inYear / DAYS_PER_MONTH) + 1;
  const d = (inYear % DAYS_PER_MONTH) + 1;
  return { year, month, day: d };
}

export function seasonOf(day) {
  const { month } = dateOf(day);
  if (month <= 3) return 'spring';
  if (month <= 6) return 'summer';
  if (month <= 9) return 'autumn';
  return 'winter';
}

export const SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

export function fmtDate(day, { withDay = true } = {}) {
  const { year, month, day: d } = dateOf(day);
  return `天元${year}年 ${MONTH_NAMES[month - 1]}${withDay ? dayName(d) : ''}`;
}

export function monthName(day) {
  return MONTH_NAMES[dateOf(day).month - 1];
}

/** 3 年 2 個月 / 5 天 style, for durations. */
export function fmtDuration(days) {
  days = Math.max(0, Math.round(days));
  const y = Math.floor(days / DAYS_PER_YEAR);
  const m = Math.floor((days % DAYS_PER_YEAR) / DAYS_PER_MONTH);
  const d = days % DAYS_PER_MONTH;
  const parts = [];
  if (y) parts.push(`${y} 年`);
  if (m) parts.push(`${m} 個月`);
  if (!y && d) parts.push(`${d} 天`);
  return parts.join(' ') || '不到一天';
}

/** Absolute day for a given year offset (0-based) and month (1-12), handy for content timelines. */
export function dayAt(yearIndex, month = 1, d = 1) {
  return yearIndex * DAYS_PER_YEAR + (month - 1) * DAYS_PER_MONTH + (d - 1);
}
