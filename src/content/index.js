import opening from './events/opening.js';
import town from './events/town.js';
import hill from './events/hill.js';
import temple from './events/temple.js';
import forest from './events/forest.js';
import market from './events/market.js';
import valley from './events/valley.js';
import sect from './events/sect.js';
import ruins from './events/ruins.js';
import shrine from './events/shrine.js';
import ferry from './events/ferry.js';
import travel from './events/travel.js';
import inquire, { GENERIC_INQUIRE } from './events/inquire.js';
import generic, { GENERIC_EXPLORE } from './events/generic.js';

export const EVENT_LIST = [
  ...opening, ...town, ...hill, ...temple, ...forest, ...market, ...valley,
  ...sect, ...ruins, ...shrine, ...ferry, ...travel, ...inquire, ...generic,
  GENERIC_INQUIRE, GENERIC_EXPLORE,
];

export const EVENTS = Object.fromEntries(EVENT_LIST.map((e) => [e.id, e]));
