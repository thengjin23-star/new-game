import { dayAt, DAYS_PER_YEAR } from '../core/calendar.js';
import { schedule } from '../core/schedule.js';
import { rumor } from './rumors.js';

// The world's own timeline. These beats happen whether or not the player is
// there; content events let the player witness or change them inside their
// time windows, and the beats leave rumors when the player misses them.

export const WINDOWS = {
  breakup: [dayAt(0, 2), dayAt(0, 3)],
  wangerWedding: [dayAt(1, 2, 10), dayAt(1, 4)],
  realm: [dayAt(2, 1), dayAt(2, 3)],
  recruit: [dayAt(2, 9), dayAt(2, 10)],
  pact: [dayAt(3, 2, 20), dayAt(3, 3, 15)],
  songheEnd: [dayAt(4, 1), dayAt(4, 5, 15)],
};

const BEATS = [
  {
    at: WINDOWS.breakup[1],
    run(s) {
      if (!s.flags.lin_breakup_seen) {
        rumor(s, '林家少爺林塵被沈家當眾退婚。沈家小姐親手撕了婚書，說：「你如今，配不上我。」', 'arc', 'lin_chen');
      }
    },
  },
  {
    at: dayAt(0, 8),
    run(s) {
      if (!s.flags.lin_test_seen) {
        rumor(s, '林家族比，林塵被堂兄林浩一掌打下擂台，吐了三口血。全鎮都在笑，只有他自己沒笑。', 'arc', 'lin_chen');
      }
    },
  },
  {
    at: WINDOWS.wangerWedding[1],
    run(s) {
      if (!s.flags.wanger_wedding_seen) {
        rumor(s, '王二成親了，娶的是隔壁村的翠花。他托人給你帶了一包喜糖，說你沒來，他喝得不痛快。', 'arc', 'wang_er');
        s.npcs.wang_er.favor -= 5;
      }
      s.flags.wanger_married = true;
    },
  },
  {
    at: dayAt(1, 10),
    run(s) {
      rumor(s, '有人在黑風林以北，接連三夜看見衝天的寶光。老獵戶說，那是古戰場的方向。', 'hint');
    },
  },
  {
    at: dayAt(1, 11, 20),
    run(s) {
      s.npcs.su_qingyao.loc = 'ancient_ruins';
      s.flags.su_left_market = true;
    },
  },
  {
    at: WINDOWS.realm[0],
    run(s) {
      s.flags.realm_open = true;
      rumor(s, '古戰場遺跡的秘境開了！各路散修蜂擁而去。據說門只開一個月。', 'arc');
    },
  },
  {
    at: WINDOWS.realm[1],
    run(s) {
      s.flags.realm_open = false;
      s.flags.realm_closed = true;
      const su = s.npcs.su_qingyao;
      su.loc = 'luoxia_market';
      su.stage = Math.min(8, su.stage + 2);
      if (!s.flags.realm_entered) {
        rumor(s, '秘境關閉了。進去的人只出來一半。聽說一個白衣女修帶出了一卷古經，還有人說她早就知道機關在哪。', 'arc', 'su_qingyao');
      }
    },
  },
  {
    at: dayAt(2, 3),
    run(s) {
      if (s.npcs.wang_er.alive && s.flags.wanger_married) {
        rumor(s, '王二當爹了，是個大胖小子，取名王小石。', 'arc', 'wang_er');
      }
    },
  },
  {
    at: dayAt(2, 7),
    run(s) {
      s.flags.recruit_notice = true;
      s.nodes.qingyun_sect.known = true;
      rumor(s, '青雲宗十年一度開山收徒，就在今年九月！地點：落霞坊市以東三日的青雲峰。', 'arc');
    },
  },
  {
    at: WINDOWS.recruit[0],
    run(s) {
      s.flags.recruit_open = true;
    },
  },
  {
    at: WINDOWS.recruit[1],
    run(s) {
      s.flags.recruit_open = false;
      const lin = s.npcs.lin_chen;
      if (!s.flags.lin_ruined) {
        lin.realm = 1;
        lin.stage = 3;
        lin.title = '青雲宗親傳弟子';
        lin.loc = 'qingyun_sect';
        if (!s.flags.recruit_attended) {
          rumor(s, '青雲宗收徒大典上，林家那個「廢物」林塵，測出了萬中無一的雷靈根！大長老當場收他為親傳。', 'arc', 'lin_chen');
        }
      }
    },
  },
  {
    at: WINDOWS.pact[1],
    run(s) {
      const lin = s.npcs.lin_chen;
      if (s.flags.lin_ruined) return;
      lin.stage = 6;
      s.npcs.shen_qingge.title = '沈家小姐';
      if (!s.flags.pact_seen) {
        rumor(s, '三年之約！林塵一劍敗沈清歌，只說了一句：「三年前你撕的婚書，今天我還給你。」沈家顏面掃地。', 'arc', 'lin_chen');
      }
    },
  },
  {
    at: dayAt(3, 6),
    run(s) {
      rumor(s, '天劍宗劍子葉孤寒路過青雲宗，與林塵論劍三招。臨走前只說了一句：「你很好。」', 'arc', 'ye_guhan');
    },
  },
  {
    at: WINDOWS.songheEnd[0],
    run(s) {
      if (s.npcs.song_he.alive && !s.flags.songhe_saved) s.flags.songhe_dying = true;
    },
  },
  {
    at: dayAt(4, 3),
    run(s) {
      const lin = s.npcs.lin_chen;
      if (s.flags.lin_ruined) return;
      lin.loc = null;
      lin.title = '遠赴中州';
      if (lin.favor >= 30) {
        schedule(s, 'lin_farewell', 0, 5, { expire: 2 * DAYS_PER_YEAR });
      } else {
        rumor(s, '林塵離開東荒，去了中州。走之前，他在林家祠堂跪了一夜。', 'arc', 'lin_chen');
      }
    },
  },
  {
    at: WINDOWS.songheEnd[1],
    run(s) {
      const sh = s.npcs.song_he;
      if (!sh.alive || s.flags.songhe_saved) return;
      sh.alive = false;
      sh.diedDay = s.day;
      s.flags.songhe_dying = false;
      s.flags.songhe_dead = true;
      if (sh.favor >= 25) s.flags.songhe_legacy = true;
      rumor(s, '清虛觀的松鶴道人坐化了。山下的樵夫說，那天觀裡的老松樹，一夜之間落光了針葉。', 'arc', 'song_he');
    },
  },
  {
    at: dayAt(5, 9),
    run(s) {
      rumor(s, '最近夜裡的月亮，邊上帶著一圈淡淡的紅。老人們說，這不是好兆頭。', 'hint');
    },
  },
  {
    at: dayAt(20, 1),
    run(s) {
      if (s.npcs.wang_er.alive) rumor(s, '王二的兒子王小石也成親了。王二的背，有點駝了。', 'arc', 'wang_er');
    },
  },
  {
    at: dayAt(44, 1),
    run(s) {
      if (s.npcs.wang_er.alive) s.flags.wanger_dying = true;
    },
  },
  {
    at: dayAt(45, 1),
    run(s) {
      const w = s.npcs.wang_er;
      if (!w.alive) return;
      w.alive = false;
      w.diedDay = s.day;
      s.flags.wanger_dying = false;
      rumor(s, '青石鎮的王二走了，享年六十二歲。聽說他臨終前一直望著門口，說在等一個朋友。', 'arc', 'wang_er');
    },
  },
].sort((a, b) => a.at - b.at);

export const BEAT_DAYS = BEATS.map((b) => b.at);

/** Run every beat whose day has come. */
export function runArcs(s) {
  while (s.arcIdx < BEATS.length && BEATS[s.arcIdx].at <= s.day) {
    BEATS[s.arcIdx].run(s);
    s.arcIdx += 1;
  }
}

/** Recurring world events: yearly auction, sect recruitment every ten years. */
export function recurring(s) {
  const doy = s.day % DAYS_PER_YEAR;
  const year = Math.floor(s.day / DAYS_PER_YEAR);
  const auctionStart = dayAt(0, 10, 10);
  s.flags.auction_open = doy >= auctionStart && doy < auctionStart + 15 && s.day >= 200;
  if (doy >= auctionStart - 30 && doy < auctionStart && s.vars.auctionNotice !== year && s.day >= 170) {
    s.vars.auctionNotice = year;
    rumor(s, '落霞坊市的拍賣會下個月開場。據說今年的壓軸，是一顆築基丹。', 'hint');
  }
  const recruitBase = WINDOWS.recruit[0];
  if (s.day > WINDOWS.recruit[1]) {
    const k = (s.day - recruitBase) % (10 * DAYS_PER_YEAR);
    s.flags.recruit_open = k >= 0 && k < 30;
  }
}
