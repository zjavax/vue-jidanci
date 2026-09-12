// 验证 textarea 改动：控件类型 / 过滤 / 标签切换 / 全部隐藏
// 用法: node cdp-verify.js <wsUrl> <seedUrl> <是否测标签切换:1|0>
const WS_URL = process.argv[2];
const SEED_URL = process.argv[3];
const TEST_TAGS = process.argv[4] === "1";

const ws = new WebSocket(WS_URL);
let seq = 0;
const pending = new Map();

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(expr, timeoutMs = 60000, label = "") {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = await evaluate(expr);
    if (v) return v;
    await sleep(400);
  }
  throw new Error(`waitFor 超时 ${label}`);
}

const SNAP = `JSON.stringify({
  active: document.querySelectorAll('.event-card:not(.managed)').length,
  managed: document.querySelectorAll('.event-card.managed').length,
  blockCount: (document.querySelector('.block-count') || {}).textContent || '(无)',
  textarea: !!document.querySelector('.block-input textarea'),
  shortInput: !!document.querySelector('.block-input input'),
  label: (document.querySelector('.block-label') || {}).textContent || '(无)',
  rows: (document.querySelector('.block-input textarea') || {}).rows || 0,
  value: (document.querySelector('.block-input textarea') || {}).value || '',
  apiCalls: performance.getEntriesByType('resource').filter(r => r.name.includes('gamma-api')).length
})`;

async function clickByText(label) {
  const r = await evaluate(`
    (() => {
      const b = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === '${label}');
      if (!b.length) return 'NOT_FOUND';
      b[0].click();
      return 'CLICKED';
    })()
  `);
  if (r !== "CLICKED") throw new Error(`没找到按钮「${label}」`);
}

(async () => {
  await new Promise((r) => (ws.onopen = r));
  await send("Page.enable");
  await send("Runtime.enable");

  await send("Page.navigate", { url: SEED_URL });
  await waitFor(
    `document.querySelectorAll('.event-card:not(.managed)').length > 0 && document.querySelectorAll('.event-card:not(.managed)').length`,
    60000,
    "等待卡片渲染"
  );
  await sleep(2500);

  console.log("【初始】", await evaluate(SNAP));

  if (TEST_TAGS) {
    await clickByText("体育");
    await sleep(6000);
    console.log("【切到 体育】", await evaluate(SNAP));
  }

  const hasBtn = await evaluate(
    `[...document.querySelectorAll('button')].some(x => x.textContent.trim() === '全部隐藏')`
  );
  if (hasBtn) {
    await clickByText("全部隐藏");
    await sleep(8000);
    console.log("【点全部隐藏后】", await evaluate(SNAP));
  } else {
    console.log("（无「全部隐藏」按钮，跳过）");
  }

  ws.close();
  process.exit(0);
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
