import type { MintProvenance, PoolIntentKind, TradeIntent } from "../kernel/contracts.js";
import { type TokenAmount } from "../kernel/money.js";
import type { VenueTxDraft } from "./types.js";
/**
 * Turning a built transaction into a kernel-ready `TradeIntent`.
 *
 * Everything this package produces is an *intent*. No function in this file signs,
 * broadcasts, or touches a keypair; the output is plain journalable data that
 * `TradeGateway.execute()` re-validates from scratch. Three constraints of the
 * existing contract shape the code below, and each is honoured rather than
 * worked around:
 *
 *  1. **`kind` names the action.** `IntentKind` carries the eight pool/curve
 *     kinds, so the journal records what actually happened instead of flattening
 *     every liquidity action into `'swap'`. Every one of them settles the
 *     swap-shaped way — a token leg leaves and a token leg arrives — so the
 *     kernel's input-leg cap binds them correctly with no special case.
 *
 *  2. **The input leg must be positive.** Withdraw-shaped actions (remove, close,
 *     claim) move nothing out of free balance except the transaction's own cost,
 *     so they declare that cost as the input leg — see `withdrawInputLeg`. It is
 *     literally what leaves the wallet, it is bounded, and charging it against the
 *     SOL cap is conservative rather than permissive.
 *
 *  3. **`minOutAmount` must be consistent with the clamped slippage.** The kernel
 *     recomputes implied slippage from `outAmount` vs `minOutAmount` and rejects a
 *     mismatch, so builders here set both together or set both to zero — never one
 *     of the two.
 */
/** Base fee per signature, in lamports. */
export declare const BASE_FEE_LAMPORTS = 5000;
export interface PoolIntentMeta {
    readonly action: PoolIntentKind;
    readonly venue: string;
    readonly poolAddress: string | undefined;
    readonly positionAddress: string | undefined;
    /** Structured detail for display / journalling. Never trusted by the kernel. */
    readonly detail: Record<string, unknown>;
    readonly warnings: readonly string[];
}
export interface BuiltIntent {
    readonly intent: TradeIntent;
    readonly meta: PoolIntentMeta;
}
/**
 * The input leg of a withdraw-shaped action: the transaction's own cost ceiling.
 *
 * `rentAllowanceLamports` covers accounts the transaction may have to create (a
 * bin array, an ATA). Rent that comes *back* — a closed position's — is ignored,
 * because a cap must bound the outflow, not net it against a hoped-for refund.
 */
export declare function withdrawInputLeg(args: {
    readonly priorityFeeLamports: number;
    readonly signatures?: number;
    readonly rentAllowanceLamports?: bigint;
}): TokenAmount;
export interface IntentDraft {
    /** The action this intent performs. Recorded on the intent and in the journal. */
    readonly kind: PoolIntentKind;
    readonly source: string;
    readonly input: TokenAmount;
    readonly output: {
        readonly mint: string;
        readonly decimals: number;
    };
    readonly inputProvenance?: MintProvenance;
    readonly outputProvenance?: MintProvenance;
    readonly unsignedTxBase64: string;
    readonly recentBlockhash: string;
    readonly lastValidBlockHeight: number;
    readonly priorityFeeLamports: number;
    readonly summary: string;
    /** Expected out in base units. 0 for actions where nothing lands in spot balance. */
    readonly expectedOut: bigint;
    /** Worst-case out the transaction commits to. Must be ≤ `expectedOut`. */
    readonly minOut: bigint;
    readonly slippageBps: number;
    readonly routeLabel: string;
    readonly priceImpactPct?: number;
}
/**
 * Assemble a `TradeIntent`. Validates the shape the kernel will check anyway, so a
 * malformed intent fails here — where the error names the builder — instead of
 * three layers down inside the gateway.
 */
export declare function toTradeIntent(d: IntentDraft): TradeIntent;
/**
 * Accept a venue draft only if the agent's wallet can sign it alone.
 *
 * DLMM's `initialize_position*` family needs a second signer — a fresh position
 * keypair (or the `base` key behind the position PDA). The kernel's `WalletProvider`
 * signs exactly one key by design, and quietly generating a throwaway keypair
 * inside a tool would put key material back on the path the whole architecture
 * exists to keep it off. So this refuses, loudly, and the report says what the
 * kernel would need to support it.
 */
export declare function assertWalletSignableAlone(draft: VenueTxDraft, source: string): void;
