import Fastify from "fastify";
import cors from "@fastify/cors";
import { analyzeRisk } from "../risk/index.js";
const qs = {
    type: "object",
    properties: {
        network: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        period: { enum: ["minute", "hour", "day"] },
    },
    additionalProperties: false,
};
export function createUtilityApi(c) {
    const app = Fastify({ logger: false });
    app.openapi = {
        openapi: "3.1.0",
        info: { title: "Read-only Market Utility API", version: "1.0.0" },
        paths: {},
    };
    void app.register(cors, { origin: c.corsOrigin ?? false });
    const hits = new Map();
    app.addHook("onRequest", async (req, reply) => {
        if (req.method !== "GET" && req.method !== "OPTIONS")
            return reply.code(405).send({
                error: {
                    code: "METHOD_NOT_ALLOWED",
                    message: "Only read-only GET requests are supported",
                },
            });
        if (c.rateLimit) {
            const key = req.ip, now = Date.now(), x = hits.get(key);
            const h = !x || now - x.start >= c.rateLimit.windowMs
                ? { n: 1, start: now }
                : { n: x.n + 1, start: x.start };
            hits.set(key, h);
            reply.header("x-ratelimit-limit", c.rateLimit.max);
            if (h.n > c.rateLimit.max)
                return reply.code(429).send({
                    error: { code: "RATE_LIMITED", message: "Rate limit exceeded" },
                });
        }
    });
    app.setErrorHandler((e, _req, reply) => {
        const validation = e.validation;
        reply.code(validation ? 400 : 500).send({
            error: {
                code: validation ? "VALIDATION_ERROR" : "INTERNAL_ERROR",
                message: validation
                    ? "Request validation failed"
                    : "Unexpected server error",
                details: validation,
            },
        });
    });
    const run = async (p, reply) => {
        let timer;
        try {
            return {
                data: await Promise.race([
                    p,
                    new Promise((_, rej) => {
                        timer = setTimeout(() => rej(new Error("TIMEOUT")), c.timeoutMs ?? 8_000);
                    }),
                ]),
                meta: { timestamp: new Date().toISOString() },
            };
        }
        catch (e) {
            if (e instanceof Error && e.message === "TIMEOUT") {
                reply.code(504);
                return {
                    error: { code: "UPSTREAM_TIMEOUT", message: "Data source timed out" },
                };
            }
            throw e;
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    };
    const route = (path, schema, handler) => {
        app.openapi.paths[path.replace(/:([^/]+)/g, "{$1}")] = {
            get: {
                responses: { "200": { description: "Successful read" } },
                ...schema,
            },
        };
        app.get(path, { schema }, handler);
    };
    route("/health", {}, async () => ({
        data: { status: "ok", readOnly: true },
        meta: { timestamp: new Date().toISOString() },
    }));
    route("/networks", {}, (_q, r) => run(c.source.networks(), r));
    route("/search", {
        querystring: {
            ...qs,
            required: ["q"],
            properties: {
                ...qs.properties,
                q: { type: "string", minLength: 1, maxLength: 200 },
            },
        },
    }, (q, r) => run(c.source.search(q.query.q, q.query.network), r));
    route("/trending", { querystring: { ...qs, required: ["network"] } }, async (q, r) => run(c.source
        .trending(q.query.network)
        .then((rows) => rows.map((x) => ({ ...x, trendingScore: scoreTrend(x) }))), r));
    route("/pairs/new", { querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.newPairs(q.query.network), r));
    const params = {
        type: "object",
        required: ["address"],
        properties: { address: { type: "string", minLength: 2, maxLength: 128 } },
        additionalProperties: false,
    };
    route("/tokens/:address", { params, querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.token(q.query.network, q.params.address), r));
    route("/pairs/:address", { params, querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.pair(q.query.network, q.params.address), r));
    route("/pairs/:address/ohlcv", { params, querystring: { ...qs, required: ["network", "period"] } }, (q, r) => run(c.source.ohlcv(q.query.network, q.params.address, q.query.period, q.query.limit), r));
    route("/pairs/:address/trades", { params, querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.trades(q.query.network, q.params.address, q.query.limit), r));
    route("/tokens/:address/holders", { params, querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.holders(q.query.network, q.params.address, q.query.limit), r));
    route("/tokens/:address/risk", { params, querystring: { ...qs, required: ["network"] } }, (q, r) => run(c.source.riskInput(q.query.network, q.params.address).then(analyzeRisk), r));
    return app;
}
export function scoreTrend(x) {
    const vol = Math.max(0, Number(x.volume24hUsd ?? 0)), liq = Math.max(0, Number(x.liquidityUsd ?? 0)), change = Math.abs(Number(x.priceChange24hPercent ?? 0));
    return (Math.round(Math.min(100, Math.log10(vol + 1) * 12 +
        Math.log10(liq + 1) * 8 +
        Math.min(change, 100) * 0.2) * 100) / 100);
}
