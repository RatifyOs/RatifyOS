import type { JupiterClient, SolanaReader, TradeGateway } from "../kernel/contracts.js";
import type { StrategyExecutor } from "./runner.js";
/** The tool name recorded on every intent a strategy produces. */
export declare const STRATEGY_SOURCE = "strategy_runner";
export interface GatewayExecutorDeps {
    /** The ONE path to value movement. There is no other in this module. */
    readonly gateway: TradeGateway;
    readonly jupiter: JupiterClient;
    /** Read side, for mint decimals. */
    readonly solana: SolanaReader;
    readonly ownerWallet: string;
    /**
     * The operator's pinned mint list — normally `PolicyConfig.mintAllowlist`.
     * Anything outside it (and outside the quote assets) is `untrusted`, which
     * the kernel refuses without a per-trade human confirmation. See below.
     */
    readonly pinnedMints?: () => readonly string[] | null | undefined;
    readonly priorityFeeLamports?: number;
    readonly defaultSlippageBps?: number;
    /** Price feed for trailing-stop / take-profit strategies. */
    readonly price?: (mint: string) => Promise<number | undefined>;
    readonly notify?: (userId: number, text: string) => Promise<void>;
}
/**
 * Build the executor the {@link StrategyRunner} is mounted with.
 *
 * ── Why this file is the interesting one ────────────────────────────────────
 *
 * A strategy runner is the most tempting place in an agent to grow a private
 * execution path: it already runs unattended on a timer, so "just sign it here"
 * is one refactor away. It does not have one. `swap()` below quotes, assembles
 * a plain `TradeIntent`, and calls `gateway.execute()`. There is no keypair in
 * scope, no broadcaster, no `sign`, and no RPC write — the read port is
 * `SolanaReader`, which cannot send anything. Every safety property the swap
 * tools get, autonomous strategies get for the same reason and in the same
 * place: caps on the input leg, slippage clamp, priority-fee ceiling, mint
 * allow/deny, kill switch, idempotency, journal.
 *
 * ── On `confirmedByUser` ────────────────────────────────────────────────────
 *
 * It is never set here, and that is deliberate rather than an omission. It
 * means "a human pressed Confirm for THIS trade", which by construction no one
 * did — the point of a schedule is that nobody is watching. So an unpinned mint
 * (`untrusted` provenance) is refused by `MINT_NOT_PINNED` rather than waved
 * through by an autonomous caller asserting consent on the operator's behalf.
 * The way to run a strategy on a token is to pin the mint in policy, which is
 * an explicit, durable, operator-side act — not a flag the runner can set.
 */
export declare function gatewayExecutor(deps: GatewayExecutorDeps): StrategyExecutor;
