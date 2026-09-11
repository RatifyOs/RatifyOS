import type { BalanceReader, Broadcaster, ConfirmOutcome, Confirmer, ConfirmStatus, MintInfo, MintInspector, PerpPositionRef, PositionReader, SignedTx, SimOutcome, Simulator, WalletProvider } from "../contracts.js";
/** A tiny in-memory "chain" the mock ports share, so a broadcast actually moves mock balances. */
export declare class MockChain {
    readonly balances: Map<string, bigint>;
    fill: {
        inMint: string;
        inAmt: bigint;
        outMint: string;
        outAmt: bigint;
    } | null;
    confirmStatus: ConfirmStatus;
    simOk: boolean;
    /** When set, MockBroadcaster.broadcast throws — models an RPC send failure. */
    broadcastError: string | null;
    /** Signed venue positions, keyed by {@link positionKey}. Positive = long. */
    readonly positions: Map<string, bigint>;
    /** Signed base-unit change a confirmed broadcast applies to `positionFillKey`. */
    positionFill: {
        key: string;
        delta: bigint;
    } | null;
    /** When set, MockPositions.readPosition throws — models an unreadable venue. */
    positionError: string | null;
    applyFill(): void;
}
export declare function positionKey(ref: PerpPositionRef): string;
/** A venue position book the gateway's perp settle check can diff against. */
export declare class MockPositions implements PositionReader {
    #private;
    constructor(chain: MockChain);
    readPosition(ref: PerpPositionRef): Promise<bigint>;
}
export declare class MockMints implements MintInspector {
    #private;
    constructor(token2022?: string[]);
    inspect(mint: string): Promise<MintInfo>;
}
export declare class MockBalances implements BalanceReader {
    #private;
    constructor(chain: MockChain);
    readBalance(_owner: string, mint: string): Promise<bigint>;
}
export declare class MockSimulator implements Simulator {
    #private;
    constructor(chain: MockChain);
    simulate(_wireBase64: string): Promise<SimOutcome>;
}
export declare class MockBroadcaster implements Broadcaster {
    #private;
    constructor(chain: MockChain);
    broadcast(signed: SignedTx, _landHandle: string | undefined): Promise<{
        signature: string;
    }>;
}
export declare class MockConfirmer implements Confirmer {
    #private;
    constructor(chain: MockChain);
    confirm(_signature: string, _lastValidBlockHeight: number): Promise<ConfirmOutcome>;
}
export declare class MockWallet implements WalletProvider {
    readonly pubkey = "MockWa11et1111111111111111111111111111111111";
    sign(unsignedTxBase64: string): Promise<SignedTx>;
}
