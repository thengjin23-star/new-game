# 素材槽（assets/）

遊戲裡凡是用筆刷自己畫的東西，都可以換成一張畫好的圖。把圖放進這個資料夾，再寫進 `manifest.json`，遊戲就會用圖；沒有圖的地方照舊用筆刷畫。

```json
{
  "card/player": "cards/player.webp",
  "card/npc:lin_chen": "cards/lin_chen.webp",
  "event/intro_fall": "events/intro_fall.webp"
}
```

| 槽位 | 用途 | 建議 |
| --- | --- | --- |
| `card/player` | 你自己站在世界裡的樣子 | 透明背景、腳在圖底中央、高約為寬的 2 倍 |
| `card/npc:<id>` | 有名有姓的人物（如 `lin_chen`、`song_he`、`su_qingyao`） | 同上 |
| `card/folk:<0-5>` | 路人：農夫、婦人、老者、孩童、散修、宗門弟子 | 同上 |
| `card/mob:<kind>` | 野獸與敵人：`wolf`、`snake`、`bandit`、`ghost` | 同上 |
| `event/<id>` | 事件的插圖，顯示在事件標題上方 | 橫幅，約 16:9 |

單頁版（claude.ai 上的連結）不讀這個資料夾，只用筆刷。
