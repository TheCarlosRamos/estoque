const { Redis } = require("@upstash/redis");

const STATE_KEY = "book_inventory_shared_state_v1";

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function defaultState() {
  return { books: [], logs: [], users: [] };
}

function sanitizeState(state) {
  return {
    books: Array.isArray(state?.books) ? state.books : [],
    logs: Array.isArray(state?.logs) ? state.logs : [],
    users: Array.isArray(state?.users) ? state.users : [],
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: "Banco compartilhado nao configurado." });
  }

  try {
    if (req.method === "GET") {
      const state = (await redis.get(STATE_KEY)) || defaultState();
      return res.status(200).json(sanitizeState(state));
    }

    if (req.method === "POST") {
      const state = sanitizeState(req.body);
      await redis.set(STATE_KEY, state);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  } catch (error) {
    return res.status(500).json({ error: "Falha ao acessar o banco compartilhado." });
  }
};
