import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isPublicKey } from "../signer/transaction.js";
/**
 * The default setup policy, deliberately narrow.
 *
 * ComputeBudget fees plus SPL Token `Revoke` — the one instruction that can
 * only ever reduce what someone else may move, and the reason `trade revoke`
 * works out of the box. `Revoke` is classified `effect: "none"` because it is
 * incapable of moving value; every value-moving program is left OUT, so a swap
 * requires the operator to add the program, pin its discriminator, and write an
 * input-leg cap for the mint by hand. See docs/TRADING.md §3.
 */
const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/** All-zero Ed25519 public key: the placeholder an operator must replace. */
const UNSET_ACCOUNT = "11111111111111111111111111111111";
const json = (x) => JSON.stringify(x, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
async function exists(p) {
    try {
        await stat(p);
        return true;
    }
    catch {
        return false;
    }
}
async function privateWrite(p, x, force = false) {
    if (!force && (await exists(p)))
        throw Error(`already_exists: ${p}`);
    await writeFile(p, x, { mode: 0o600 });
    await chmod(p, 0o600);
}
const required = (a, key) => {
    const v = a[key];
    if (typeof v !== "string" || !v)
        throw Error(`${key} required`);
    return v;
};
const integer = (a, key) => {
    const v = required(a, key);
    if (!/^\d+$/.test(v))
        throw Error(`${key} must be a non-negative integer`);
    return BigInt(v);
};
const mint = (v, key) => {
    if (!isPublicKey(v))
        throw Error(`${key} must be a base58 Solana address`);
    return v;
};
export async function createOperatorDecisionProof(path, input) {
    const key = (await readFile(path)).toString("utf8").trim();
    if (!key)
        throw Error("operator key is empty");
    const timestamp = Date.now(), nonce = randomUUID(), body = { ...input, nonce, timestamp };
    return {
        operator: input.operator,
        decision: input.decision,
        challenge: input.challenge,
        nonce,
        expectedRevision: input.expectedRevision,
        timestamp,
        proof: createHmac("sha256", key).update(JSON.stringify(body)).digest("hex"),
        ...(input.reason ? { reason: input.reason } : {}),
    };
}
export function createUserWorkflow(c) {
    const proof = c.operatorProof ??
        (async (id, decision, reason) => {
            const x = c.trading?.status(id);
            const status = await x;
            if (!status?.challenge || !Number.isInteger(status.approvalRevision))
                throw Error("approval challenge unavailable");
            return createOperatorDecisionProof(join(c.dataDir, "operator.key"), {
                requestId: id,
                operator: "operator",
                decision,
                challenge: status.challenge,
                expectedRevision: status.approvalRevision,
                ...(reason ? { reason } : {}),
            });
        });
    return async (req) => {
        await mkdir(c.dataDir, { recursive: true, mode: 0o700 });
        if (req.group === "setup") {
            const force = req.args.force === true, account = String(req.args.account ?? UNSET_ACCOUNT), socket = join(c.dataDir, "signer.sock");
            if (!isPublicKey(account))
                throw Error("account must be a base58 Solana public key");
            const files = [
                {
                    name: "config.json",
                    value: json({
                        version: 1,
                        mode: req.args.remote ? "remote" : "local",
                        remote: req.args.remote ?? null,
                        rpcUrl: req.args.rpc ?? null,
                        socket,
                        account,
                    }),
                },
                {
                    name: "policy.json",
                    value: json({
                        version: 1,
                        // 1 SOL in lamports. Every amount is base units of the mint
                        // LEAVING the wallet — the input leg — so no price oracle sits in
                        // the safety path.
                        maxAmountIn: "1000000000",
                        maxSlippageBps: 100,
                        approvalRequired: true,
                        // Solana has no confirmation depth to count: `finalized` is rooted.
                        finalityCommitment: "finalized",
                        allowedMints: [],
                    }),
                },
                {
                    name: "sign-policy.json",
                    value: json({
                        version: 1,
                        cluster: "mainnet-beta",
                        feePayers: [account],
                        programs: [
                            {
                                programId: COMPUTE_BUDGET_PROGRAM,
                                discriminator: "02",
                                effect: "fee",
                            },
                            {
                                programId: COMPUTE_BUDGET_PROGRAM,
                                discriminator: "03",
                                effect: "fee",
                            },
                            {
                                programId: TOKEN_PROGRAM,
                                discriminator: "05",
                                effect: "none",
                            },
                        ],
                        // No spend instruction is allowed by default, so no asset may
                        // leave beyond the capped fee. `native` is lamports.
                        caps: { native: "0" },
                        maxInstructions: 8,
                        maxAccountKeys: 32,
                        maxRequiredSignatures: 1,
                        maxComputeUnitLimit: 400000,
                        maxComputeUnitPriceMicroLamports: "50000",
                        maxPriorityFeeLamports: "15000",
                        // Empty means any transaction carrying a lookup table is refused:
                        // the signer cannot resolve looked-up addresses without trusting
                        // an external RPC.
                        addressLookupTables: [],
                    }),
                },
                ...[
                    "signer.token",
                    "api.token",
                    "authorization.key",
                    "operator.key",
                ].map((name) => ({ name, value: randomBytes(32).toString("hex") })),
            ];
            for (const f of files)
                await privateWrite(join(c.dataDir, f.name), f.value, force);
            return {
                initialized: true,
                dataDir: c.dataDir,
                files: files.map((f) => f.name),
                next: [
                    `raos wallet create --keystore ${join(c.dataDir, "wallet.json")} --password-fd 0`,
                    "raos signer start",
                    "raos portfolio",
                ],
            };
        }
        if (req.group === "wallet" || req.group === "signer") {
            if (req.group === "signer" && req.action === "status")
                return {
                    running: await exists(join(c.dataDir, "signer.sock")),
                    socket: join(c.dataDir, "signer.sock"),
                    guidance: "Start with: raos signer start",
                };
            if (!c.spawnSigner)
                throw Error(`${req.group} ${req.action} requires isolated raos-signer`);
            return c.spawnSigner(req.action, req.args);
        }
        if (req.group === "portfolio") {
            if (c.trading?.portfolio)
                return c.trading.portfolio();
            if (!c.rpc)
                throw Error("trading service or RPC not configured");
            const address = mint(required(req.args, "address"), "address");
            // `getBalance` answers in lamports, wrapped in an RPC context envelope.
            // Read only `value`, and read it as a bigint: lamport balances exceed
            // Number.MAX_SAFE_INTEGER above ~9M SOL.
            const balance = (await c.rpc("getBalance", [
                address,
                { commitment: "confirmed" },
            ]));
            const lamports = typeof balance === "object" && balance !== null
                ? (balance.value ?? 0)
                : balance;
            return { address, nativeBalance: BigInt(lamports).toString() };
        }
        if (!c.trading)
            throw Error("trading service not configured");
        const a = req.args;
        if (req.action === "quote")
            return c.trading.quote({
                side: String(a.side ?? "buy"),
                inputMint: mint(required(a, "tokenIn"), "tokenIn"),
                outputMint: mint(required(a, "tokenOut"), "tokenOut"),
                amountIn: integer(a, "amountIn"),
                slippageBps: Number(required(a, "slippage")),
            });
        if (req.action === "buy" || req.action === "sell")
            return c.trading.execute(required(a, "quoteId"), {
                idempotencyKey: required(a, "idempotencyKey"),
                actor: String(a.actor ?? "cli"),
                dryRun: a.live !== true,
            });
        if (req.action === "revoke") {
            if (!c.trading.revoke)
                throw Error("revoke unavailable in this mode");
            // `--token` is the token ACCOUNT whose delegate is being cleared, not the
            // mint: SPL `Revoke` acts on the account that holds the delegation.
            return c.trading.revoke(mint(required(a, "token"), "token"), {
                idempotencyKey: required(a, "idempotencyKey"),
                actor: String(a.actor ?? "cli"),
                dryRun: a.live !== true,
            });
        }
        if (req.action === "approve" || req.action === "deny") {
            const id = required(a, "id"), decision = req.action;
            const p = await proof(id, decision, typeof a.reason === "string" ? a.reason : undefined);
            const { operator, ...input } = p;
            return decision === "approve"
                ? c.trading.approve(id, operator, input)
                : c.trading.deny(id, operator, input);
        }
        if (req.action === "submit")
            return c.trading.submit(required(a, "id"));
        if (req.action === "status")
            return c.trading.status(required(a, "id"));
        if (req.action === "reconcile")
            return c.trading.reconcile(required(a, "id"));
        throw Error(`Unknown trade action: ${req.action}`);
    };
}
export async function httpRpc(url, method, params) {
    const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const x = await r.json();
    if (x.error)
        throw Error(`rpc error ${x.error.code}`);
    return x.result;
}
