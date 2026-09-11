import { Connection } from "@solana/web3.js";
import type { Broadcaster, SignedTx } from "../../kernel/contracts.js";
import { SolanaRpc } from "./rpc.js";
/** Lands a signed tx straight to the configured RPC. Preflight is skipped (the kernel already simulated). */
export declare class SelfRpcBroadcaster implements Broadcaster {
    #private;
    constructor(rpc: SolanaRpc | Connection);
    broadcast(signed: SignedTx, _landHandle: string | undefined): Promise<{
        signature: string;
    }>;
}
