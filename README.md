# 一介散修

> 天道為眾生寫好了命。只有你，不在命簿上。

一款手機網頁放置修仙遊戲。你是東荒邊陲的一個凡人，資質平庸，這個世界另有它的天驕與主角。你靠著一個不太可靠的輔助系統，一步一步修煉、探索，看這個世界和裡面每個人的故事。

- 一整片相連的大世界，自己走、自己看、自己決定去哪裡。沒去過的地方蓋著雲。
- 故事發生在世界裡：走到林家門口、走進黑風林、走到斷魂崖下，才會遇上。
- 白天、黃昏、夜裡；有些人只在夜裡出現，有些東西要走近了才看得見。
- 閉關需要真實時間，關掉遊戲也會繼續。閉關出來，世界已經變了。
- 一個選擇，可能在好幾年之後才回來找你。
- 美術全部用程式繪製（俯瞰的水墨古地圖），不需要任何圖片檔。

操作：按住畫面任意處拖動來行走；點地面會自己走過去；點人或東西會走過去互動；兩指縮放。電腦上可用 WASD 或方向鍵、E 互動、M 地圖。

設計細節見 [docs/GDD.md](docs/GDD.md)。

## 試玩

不需要安裝任何東西，用任何靜態伺服器打開專案根目錄即可（瀏覽器的 ES module 不能直接從檔案開啟）：

```bash
python3 -m http.server 8080
# 打開 http://localhost:8080
```

測試用加速：網址加上 `?speed=60`，閉關會快 60 倍。加上 `?debug` 會把遊戲掛在 `window.__debug`，方便用工具試玩。

### 加到手機主畫面

這是一個 PWA。部署到網路上之後，用手機瀏覽器打開，選「加入主畫面」，就能像 App 一樣全螢幕開啟，沒網路也能玩。

### 部署到 GitHub Pages

1. Repo 的 Settings → Pages
2. Source 選「Deploy from a branch」，分支選要發布的分支、資料夾選 `/ (root)`
3. 幾分鐘後就會有網址

私人 repo 需要付費方案才能使用 Pages。

## 開發

```bash
npm install      # 只需要 esbuild，用來打包單頁版本
npm test         # 引擎、內容驗證、故事線、隨機試玩測試
npm run build    # 產生 precache.json（離線快取清單）與 dist/yijie-sanxiu.html（單頁版）
```

## 結構

```
index.html              入口
styles/main.css         介面樣式（宣紙、墨色、朱印）
src/
  main.js               啟動
  core/                 引擎：亂數、曆法、修煉、時間、事件、行動、存檔
  world/geo.js          世界的形狀：區域、山、河、湖、路
  world/places.js       世界裡的東西：建築、地點、人物站的位置、野獸、靈草
  world/terrain.js      由上面算出可走的格子、碰撞、尋路、樹與山
  world/fog.js          雲霧（看過哪些地方）
  world/explore.js      行走、時間、遭遇、互動
  world/                以及區域資料、人物、世界時間軸、傳聞、問道系統
  content/              物品、功法、殘頁，以及 events/ 底下的所有事件
  art/worldview.js      俯瞰的水墨世界
  art/sprites.js        樹、山、建築、各種東西
  art/figures.js        人物與野獸
  art/ink.js            標題畫面的水墨山水
  ui/                   介面
  platform/cloud.js     在 claude.ai 上執行時的雲端存檔
tests/                  node:test 測試
docs/GDD.md             遊戲設計文件
```

## 新增事件

事件是 `src/content/events/` 底下的資料，引擎不用改。最簡單的事件長這樣：

```js
{
  id: 'hill_example',          // 唯一
  trigger: 'explore',          // explore | arrive | travel | inquire | visit | scheduled
  nodes: ['qingshi_hill'],     // 在哪個區域發生
  poi: 'stele',                // 綁在世界裡的哪個地點（places.js）；不寫就是在這區域走著走著遇到
  auto: false,                 // true：走近就開始；false：要上前查看
  once: true,                  // 只發生一次（或用 cooldown: 天數）
  minExplore: 20,              // 探索度門檻
  cond: (s) => s.day > 100,    // 其他條件
  title: '標題',
  text: '事件描述。',
  choices: [
    {
      text: '選項一',
      check: { kind: 'jiyuan', diff: 5 },   // 檢定：power 戰力、gengu 根骨、wuxing 悟性、xinxing 心性、jiyuan 機緣
      ok:   { text: '成功的結果', effects: [['item', 'ningqi_grass', 2]] },
      fail: { text: '失敗的結果', effects: [['hurt', 1]] },
    },
    {
      text: '選項二',
      out: { text: '結果', effects: [['sched', 'some_event', 360, 720]] },  // 一到兩年後發生另一件事
    },
  ],
}
```

常用效果：`xw` 修為、`ls` 靈石、`item` 物品、`flag` 旗標、`favor` 好感、`meet` 結識、`hurt`/`heal` 傷勢、`mind` 心境、`insight` 感悟、`days` 耗時、`discover` 發現地點（地圖上會露出那一塊）、`sched` 排程因果、`rumor` 傳聞、`death` 死亡。完整清單見 `src/core/effects.js`，`npm test` 會檢查所有引用是否存在。

## 新增地點

世界裡的地點寫在 `src/world/places.js` 的 `POIS`：

```js
{ id: 'stele', region: 'qingshi_hill', x: 1720, y: 2560, name: '斷碑', verb: '查看',
  sprite: 'stele',          // 地上畫什麼（可省略）
  hidden: { r: 110 },       // 走到這個距離內才會發現（可省略）
  auto: 140,                // 綁定的 auto 事件在這個半徑內自己開始（可省略）
  text: '石碑上的字被風雨磨得模糊。' }  // 沒有事件時看到的描述
```

`npm test` 會檢查每個地點都站得到、在對的區域裡、走得到。
