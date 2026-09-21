/**
 * Cloudflare GraphQL / 用量统计查询。
 * 由 functions/admin.js 引用；放在 _lib/ 下不会被当成路由。
 */

/* ---------------- Cloudflare API ---------------- */

/**
 * 执行一次 GraphQL 查询，带超时
 */
async function cfGraphQL(env, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: "api_" + res.status };
    const json = await res.json();
    return { ok: true, json };
  } catch (e) {
    return {
      ok: false,
      error: e && e.name === "AbortError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUsageSplit(env, dateStr) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return { workers: 0, pages: 0, error: "missing_config" };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
    return { workers: 0, pages: 0, error: "bad_date" };
  }

  if (!/^[a-f0-9]{32}$/i.test(String(env.CF_ACCOUNT_ID))) {
    return { workers: 0, pages: 0, error: "bad_account" };
  }

  // 首选：Workers + Pages Functions 一起查
  const fullQuery = `
    query {
      viewer {
        accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
          workers: workersInvocationsAdaptive(
            limit: 1,
            filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
          ) { sum { requests } }
          pages: pagesFunctionsInvocationsAdaptiveGroups(
            limit: 1,
            filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
          ) { sum { requests } }
        }
      }
    }
  `;

  let r = await cfGraphQL(env, fullQuery);
  if (!r.ok) {
    console.error("[fetchUsageSplit] primary", r.error);
    return { workers: 0, pages: 0, error: r.error };
  }

  // 检测 GraphQL 字段错误：如果 pages 字段不存在，降级为只查 workers
  const hasFieldError =
    r.json.errors &&
    r.json.errors.some((e) =>
      String(e.message || "").toLowerCase().includes("pagesfunctions") ||
      String(e.message || "").toLowerCase().includes("cannot query field")
    );

  if (hasFieldError) {
    console.warn("[fetchUsageSplit] pages field missing, fallback to workers only");
    const fallbackQuery = `
      query {
        viewer {
          accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
            workers: workersInvocationsAdaptive(
              limit: 1,
              filter: { date_geq: "${dateStr}", date_leq: "${dateStr}" }
            ) { sum { requests } }
          }
        }
      }
    `;
    r = await cfGraphQL(env, fallbackQuery);
    if (!r.ok) {
      console.error("[fetchUsageSplit] fallback", r.error);
      return { workers: 0, pages: 0, error: r.error };
    }
    if (r.json.errors) {
      console.error("[fetchUsageSplit] fallback graphql errors", r.json.errors);
      return { workers: 0, pages: 0, error: "api_error" };
    }
    const acc = r.json.data?.viewer?.accounts?.[0] || {};
    return {
      workers: acc.workers?.[0]?.sum?.requests || 0,
      pages: 0,
      error: null,
    };
  }

  // 其他 GraphQL 错误，直接报错
  if (r.json.errors) {
    console.error("[fetchUsageSplit] graphql errors", r.json.errors);
    return { workers: 0, pages: 0, error: "api_error" };
  }

  const acc = r.json.data?.viewer?.accounts?.[0] || {};
  return {
    workers: acc.workers?.[0]?.sum?.requests || 0,
    pages: acc.pages?.[0]?.sum?.requests || 0,
    error: null,
  };
}

export { cfGraphQL, fetchUsageSplit };
