import type { ExecuteResult, MintInfo, ToolContext, TradeGateway, TradeIntent } from "../kernel/contracts.js";
import type { AccountSnapshot, Blockhash, ChainReader } from "./chain.js";
import type { AddLiquidityArgs, DlmmPoolHandle, DlmmSdk, RemoveLiquidityArgs, SdkPoolState, SdkPosition, SdkTxParts } from "./meteora/sdk-port.js";
/**
 * Test doubles.
 *
 * Shipped as part of the package rather than hidden in a `__tests__` folder so the
 * engine's own selfcheck can drive this package end-to-end with **zero network and
 * zero keys** — the same property the kernel selfcheck has. Nothing here is used
 * by production code paths.
 */
export declare const TEST_BLOCKHASH = "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi";
export interface CurveAccountFields {
    virtualTokenReserves?: bigint;
    virtualSolReserves?: bigint;
    realTokenReserves?: bigint;
    realSolReserves?: bigint;
    tokenTotalSupply?: bigint;
    complete?: boolean;
    creator?: string;
    isMayhemMode?: boolean;
    isCashbackCoin?: boolean;
    quoteMint?: string;
    /** 49 (legacy), 81 (creator added), or 115 (current). */
    length?: number;
}
/** A synthetic `BondingCurve` account at any of its three historical lengths. */
export declare function curveAccountBuffer(f?: CurveAccountFields): Uint8Array;
export interface GlobalAccountFields {
    authority?: string;
    feeRecipient?: string;
    feeBasisPoints?: bigint;
    creatorFeeBasisPoints?: bigint;
    initialRealTokenReserves?: bigint;
    feeRecipients?: readonly string[];
}
export declare function globalAccountBuffer(f?: GlobalAccountFields): Uint8Array;
/** An SPL mint account: `decimals` is the single byte at offset 44. */
export declare function mintAccountBuffer(decimals?: number): Uint8Array;
export declare class FakeChainReader implements ChainReader {
    accounts: Map<string, AccountSnapshot>;
    balances: Map<string, bigint>;
    blockhash: Blockhash;
    calls: string[];
    set(address: string, data: Uint8Array, owner?: string, lamports?: bigint): this;
    setBalance(owner: string, mint: string, amount: bigint): this;
    getAccount(address: string): Promise<AccountSnapshot | null>;
    getMultipleAccounts(addresses: readonly string[]): Promise<readonly (AccountSnapshot | null)[]>;
    getLatestBlockhash(): Promise<Blockhash>;
    getTokenBalance(owner: string, mint: string): Promise<bigint>;
}
export interface FakePoolOptions {
    readonly state: SdkPoolState;
    readonly positions?: readonly SdkPosition[];
    /** Force `buildAddLiquidity` to demand a co-signer, as `initialize_position` does. */
    readonly requireExtraSignerOnNewPosition?: boolean | undefined;
}
export declare class FakeDlmmPool implements DlmmPoolHandle {
    #private;
    calls: string[];
    constructor(opts: FakePoolOptions);
    get state(): SdkPoolState;
    refresh(): Promise<SdkPoolState>;
    positionsOf(owner: string): Promise<readonly SdkPosition[]>;
    buildAddLiquidity(args: AddLiquidityArgs): Promise<SdkTxParts>;
    buildRemoveLiquidity(args: RemoveLiquidityArgs): Promise<SdkTxParts>;
    buildClaimFees(args: {
        readonly owner: string;
        readonly positionAddress: string;
    }): Promise<SdkTxParts>;
}
export declare class FakeDlmmSdk implements DlmmSdk {
    #private;
    addPool(opts: FakePoolOptions): FakeDlmmPool;
    openPool(poolAddress: string): Promise<DlmmPoolHandle>;
    positionsOfUser(owner: string): Promise<readonly {
        pool: string;
        position: SdkPosition;
    }[]>;
}
export interface RecordedExecution {
    readonly intent: TradeIntent;
    readonly idempotencyKey: string;
    readonly confirmedByUser: boolean;
}
/** A gateway that records intents and confirms them. It never signs anything. */
export declare class RecordingGateway implements TradeGateway {
    executions: RecordedExecution[];
    result: Partial<ExecuteResult>;
    execute(intent: TradeIntent, opts: {
        idempotencyKey: string;
        confirmedByUser?: boolean;
    }): Promise<ExecuteResult>;
}
export interface FakeToolContextOptions {
    readonly ownerWallet?: string;
    readonly mints?: Readonly<Record<string, MintInfo>>;
    readonly gateway?: TradeGateway;
}
export declare function cleanMintInfo(mint: string, decimals?: number): MintInfo;
/** A `ToolContext` with only the seams the pools tools actually touch. */
export declare function fakeToolContext(opts?: FakeToolContextOptions): ToolContext & {
    gateway: RecordingGateway;
};
