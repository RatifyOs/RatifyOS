import { type PreparedTransaction, type SimulationRequest, type SimulationResult } from "./simulation.js";
import type { AuthorizationEnvelope, HostAuthorizationVerifier } from "./authorization/index.js";
import type { SignerSignResponse } from "./authorization/wire.js";
interface Dependencies {
    simulate: (request: SimulationRequest) => Promise<SimulationResult>;
    wireVerifier?: HostAuthorizationVerifier;
    /** Cross the custody boundary. Returns the signed wire plus its signature. */
    sign?: (transaction: string, envelope: AuthorizationEnvelope) => Promise<SignerSignResponse>;
    broadcast?: (signed: string) => Promise<string>;
}
interface ExecutionContext {
    policyHash: string;
    currentSlot: bigint;
    maxSlotLag: bigint;
    allowedAssets: ReadonlySet<string>;
    /** current cluster block height, for the blockhash-expiry fence */
    currentBlockHeight?: number;
}
export interface AuthorizedExecution {
    /** base64 unsigned wire transaction */
    transaction: string;
    envelope: AuthorizationEnvelope;
}
/**
 * The execution chokepoint.
 *
 * Two rules survive the move from EVM to Solana unchanged, because neither was
 * ever about the chain:
 *
 *  - **Simulate before approve.** `prepare` is the only way to obtain the
 *    evidence an authorization can be issued against, and it refuses to return
 *    anything a safety check rejected.
 *  - **Persist signed bytes before broadcast.** The signature reaches durable
 *    storage before it reaches the network, so a crash in between is
 *    recoverable by *looking up* the signature rather than producing a second
 *    one.
 *
 * What changes is the identity being fenced. There is no account nonce to
 * compare, so the fence is the recent blockhash and its last valid block
 * height, and crossing it is terminal.
 */
export declare class ExecutionGateway {
    private readonly dependencies;
    constructor(dependencies: Dependencies);
    prepare(transaction: PreparedTransaction, context: ExecutionContext): Promise<{
        status: "SIMULATED";
        messageHash: string;
        request: SimulationRequest;
        simulation: SimulationResult;
    }>;
    execute(input: AuthorizedExecution): Promise<{
        status: "BROADCAST";
        messageHash: string;
        signature: string;
    }>;
}
export {};
