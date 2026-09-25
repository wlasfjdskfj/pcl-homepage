// 农历算法（1900-2100）+ 公历/农历节日 + 节日横幅/倒计时（从 _middleware.js 抽离）
import { escapeXaml } from './xaml.js';

// ============ 公历节日 ============
const FESTIVALS = [
  { month: 1,  day: 1,  name: "元旦",                    msg: "新的一年，新的冒险开始啦！" },
  { month: 2,  day: 14, name: "情人节",                  msg: "带上你最好的冒险伙伴，一起去探索吧！" },
  { month: 3,  day: 8,  name: "妇女节",                  msg: "致敬每一位了不起的她！" },
  { month: 4,  day: 1,  name: "愚人节",                  msg: "愚人节快乐！小心脚下的坑~" },
  { month: 5,  day: 1,  name: "劳动节",                  msg: "劳动最光荣，今天也辛苦啦！" },
  { month: 5,  day: 17, name: "Minecraft 生日",          msg: "Minecraft 生日快乐！一起来庆祝吧！" },
  { month: 6,  day: 1,  name: "儿童节",                  msg: "永远保持一颗童心，六一快乐！" },
  { month: 10, day: 31, name: "万圣节",                  msg: "不给糖就捣蛋！小心苦力怕的惊喜~" },
  { month: 11, day: 18, name: "Minecraft 1.0 发布纪念日", msg: "2011 年的今天，Minecraft 1.0 正式发布！" },
  { month: 12, day: 24, name: "平安夜",                  msg: "平安夜快乐，愿你的夜晚没有苦力怕！" },
  { month: 12, day: 25, name: "圣诞节",                  msg: "圣诞快乐！别忘了给村民准备礼物~" },
  { month: 12, day: 31, name: "跨年夜",                  msg: "今年最后一晚，明年继续挖矿！" },
];

// ============ 农历节日（农历月/日） ============
const LUNAR_FESTIVALS = [
  { lm: 1,  ld: 1,  name: "春节",   msg: "新年快乐，万事如意！" },
  { lm: 1,  ld: 15, name: "元宵节", msg: "元宵节快乐，花好月圆！" },
  { lm: 5,  ld: 5,  name: "端午节", msg: "端午安康，吃粽子了吗？" },
  { lm: 7,  ld: 7,  name: "七夕节", msg: "七夕快乐，牛郎织女来相会！" },
  { lm: 8,  ld: 15, name: "中秋节", msg: "中秋快乐，月圆人团圆！" },
  { lm: 9,  ld: 9,  name: "重阳节", msg: "重阳安康，登高望远！" },
  { lm: 12, ld: 8,  name: "腊八节", msg: "腊八节快乐，喝碗热粥吧！" },
];

// ============ 农历数据表（1900-2100） ============
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520];

function lunarLeapMonth(y){ return LUNAR_INFO[y - 1900] & 0xf; }
function lunarLeapDays(y){ return lunarLeapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function lunarMonthDays(y, m){ return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
function lunarYearDays(y){
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + lunarLeapDays(y);
}
// 农历 y年m月d日（非闰）→ 公历 {y, m, d}
function lunarToSolar(y, m, d){
  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lunarYearDays(i);
  const leap = lunarLeapMonth(y);
  let isAdd = false;
  for (let i = 1; i < m; i++){
    if (!isAdd && leap > 0 && leap <= i){ offset += lunarLeapDays(y); isAdd = true; }
    offset += lunarMonthDays(y, i);
  }
  const cal = new Date((offset + d - 31) * 86400000 + Date.UTC(1900, 1, 30));
  return { y: cal.getUTCFullYear(), m: cal.getUTCMonth() + 1, d: cal.getUTCDate() };
}
// 公历 → 农历 {y, m, d}
function solar2lunar(y, m, d){
  let objDate = new Date(y, m - 1, d);
  y = objDate.getFullYear(); m = objDate.getMonth() + 1; d = objDate.getDate();
  let offset = (Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000;
  let i, temp;
  for (i = 1900; i < 2101 && offset > 0; i++){ temp = lunarYearDays(i); offset -= temp; }
  if (offset < 0){ offset += temp; i--; }
  const year = i;
  const leap = lunarLeapMonth(year);
  let isLeap = false;
  for (i = 1; i < 13 && offset > 0; i++){
    if (leap > 0 && i === (leap + 1) && !isLeap){ --i; isLeap = true; temp = lunarLeapDays(year); }
    else temp = lunarMonthDays(year, i);
    if (isLeap && i === (leap + 1)) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && i === leap + 1){ if (isLeap) isLeap = false; else { isLeap = true; --i; } }
  if (offset < 0){ offset += temp; --i; }
  return { y: year, m: i, d: offset + 1 };
}

// 今天命中的节日（公历优先，再查农历），extra 为后台自定义节日
function getFestival(date, extra) {
  const all = (extra && extra.length) ? FESTIVALS.concat(extra) : FESTIVALS;
  const solar = all.find((f) => f.month === date.month && f.day === date.day);
  if (solar) return solar;
  const lun = solar2lunar(date.year, date.month, date.day);
  return LUNAR_FESTIVALS.find((f) => f.lm === lun.m && f.ld === lun.d) || null;
}

function buildFestivalBanner(festival) {
  if (!festival) return "";
  const text = escapeXaml("今天是 " + festival.name + "！" + festival.msg);
  return '<local:MyHint Theme="Red" Margin="0,0,0,12" Text="' + text + '" />';
}

// 节日/纪念日倒计时（右上角胶囊）；custom 为后台自定义倒计时目标
function buildCountdownXaml(date, custom, extra) {
  const today = Date.UTC(date.year, date.month - 1, date.day);
  if (custom && custom.name && custom.date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(custom.date);
    if (m) {
      const cy = +m[1], cmon = +m[2], cd = +m[3];
      let ty = cy;
      if (Date.UTC(cy, cmon - 1, cd) < today) ty = cy + 1;
      const cdiff = Math.round((Date.UTC(ty, cmon - 1, cd) - today) / 86400000);
      const cline = cdiff === 0
        ? "今天就是 " + escapeXaml(custom.name) + "！"
        : escapeXaml(custom.name) + " · 还有 " + cdiff + " 天";
      return '<Border HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,16,0" Background="#59000000" CornerRadius="12" Padding="12,8,12,8">'
        + '<TextBlock Text="' + cline + '" FontSize="12" FontWeight="Bold" Foreground="White" />'
        + '</Border>';
    }
  }
  const allF = (extra && extra.length) ? FESTIVALS.concat(extra) : FESTIVALS;
  const events = [];
  for (const f of allF) {
    let y = date.year;
    if (Date.UTC(y, f.month - 1, f.day) < today) y += 1;
    events.push({ name: f.name, year: y, month: f.month, day: f.day });
  }
  for (const y of [date.year - 1, date.year, date.year + 1]) {
    for (const f of LUNAR_FESTIVALS) {
      const s = lunarToSolar(y, f.lm, f.ld);
      if (s.y >= date.year && s.y <= date.year + 1) {
        events.push({ name: f.name, year: s.y, month: s.m, day: s.d });
      }
    }
  }
  let best = null;
  for (const e of events) {
    const diff = Math.round((Date.UTC(e.year, e.month - 1, e.day) - today) / 86400000);
    if (diff < 0) continue;
    if (!best || diff < best.diff) best = { name: e.name, diff };
  }
  if (!best) return "";
  const line = best.diff === 0
    ? "今天就是 " + escapeXaml(best.name) + "！"
    : escapeXaml(best.name) + " · 还有 " + best.diff + " 天";
  return '<Border HorizontalAlignment="Right" VerticalAlignment="Top" Margin="0,16,16,0" Background="#59000000" CornerRadius="12" Padding="12,8,12,8">'
    + '<TextBlock Text="' + line + '" FontSize="12" FontWeight="Bold" Foreground="White" />'
    + '</Border>';
}

export {
  FESTIVALS, LUNAR_FESTIVALS, LUNAR_INFO,
  lunarToSolar, solar2lunar,
  getFestival, buildFestivalBanner, buildCountdownXaml,
};
