import { Connection } from "@solana/web3.js";
import type { BalanceReader, ConfirmOutcome, Confirmer, MintInfo, MintInspector, SimOutcome, Simulator, SolanaReader, TokenHolding } from "../../kernel/contracts.js";
/** One Connection wrapper that satisfies every read-side kernel port. */
export declare class SolanaRpc implements SolanaReader, MintInspector, BalanceReader, Simulator, Confirmer {
    readonly connection: Connection;
    constructor(rpcUrl: string | Connection);
    getSolLamports(owner: string): Promise<bigint>;
    getMintInfo(mint: string): Promise<MintInfo>;
    inspect(mint: string): Promise<MintInfo>;
    getTokenHoldings(owner: string): Promise<TokenHolding[]>;
    readBalance(owner: string, mint: string): Promise<bigint>;
    /**
     * Preflight sanity only. Solana has no pinned-block `eth_call` equivalent, so
     * this is `simulateTransaction` against current state with signature
     * verification off and the built blockhash left in place — a stale blockhash
     * must surface as a failure here rather than be silently replaced.
     */
    simulate(wireBase64: string): Promise<SimOutcome>;
    /**
     * Poll until the signature lands or its blockhash expires. Expiry is TERMINAL:
     * the caller releases the reservation and fails the trade. Nothing re-signs.
     */
    confirm(signature: string, lastValidBlockHeight: number): Promise<ConfirmOutcome>;
}
