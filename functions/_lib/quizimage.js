// 每日一题横幅：按“实时天气优先 + 季节兜底 + 同池按日期轮换”选图
// 图片位于 images/quiz/，命名：spring/summer/autumn/winter-01..05.jpg（四季晴天），rain/snow-01..04.jpg、thunder/fog-01..03.jpg（特殊天气）
// 新增图片只需把文件放进 images/quiz/ 并更新下面的计数即可，无需改选图逻辑。
//
// 重要：_headers 对 /images/quiz/*.jpg 设置了 30 天浏览器缓存。
// 如果替换了同名图片（文件名不变、内容变了），必须把下面的 QUIZ_IMAGE_VERSION 加一，
// 否则老用户会在最长 30 天内继续看到旧图。

const QUIZ_IMAGE_VERSION = "q1";

// 每个季节（晴 / 多云 / 取不到天气时使用）的图片数量
const SEASON_COUNT = { spring: 5, summer: 5, autumn: 5, winter: 5 };
// 每种特殊天气的图片数量
const WEATHER_COUNT = { rain: 4, snow: 4, thunder: 3, fog: 3 };

// 按北京时间月份划分季节：3-5 春，6-8 夏，9-11 秋，12-2 冬
function seasonOf(month) {
  const m = Number(month);
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

// 北京时间日期的连续天数序号，用于同池内每日轮换
function dayNumberOf(date) {
  return Math.floor(Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day)) / 86400000);
}

// 返回每日一题横幅的完整 URL；kind 为标准天气类别（thunder/snow/rain/fog/cloudy/clear），缺失时按季节兜底
function quizImageFor(kind, date, origin) {
  const season = seasonOf(date.month);
  let stem;
  let pool;
  if (kind === "rain" || kind === "snow" || kind === "thunder" || kind === "fog") {
    stem = kind;
    pool = WEATHER_COUNT[kind];
  } else {
    // clear / cloudy / 未知 / 取不到天气：按季节
    stem = season;
    pool = SEASON_COUNT[season];
  }
  const idx = (((dayNumberOf(date) % pool) + pool) % pool) + 1;
  const file = stem + "-" + String(idx).padStart(2, "0") + ".jpg";
  return origin + "/images/quiz/" + file + "?v=" + QUIZ_IMAGE_VERSION;
}

export { quizImageFor, seasonOf, SEASON_COUNT, WEATHER_COUNT, QUIZ_IMAGE_VERSION };
