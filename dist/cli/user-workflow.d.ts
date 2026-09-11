import type { UserRequest } from "./index.js";
import type { DecisionInput } from "../execution/approvals/index.js";
import type { TradingOrchestrator } from "../live-trading/index.js";
type Rpc = (method: string, params: unknown[]) => Promise<any>;
type Trading = Pick<TradingOrchestrator, "quote" | "execute" | "approve" | "deny" | "submit" | "status" | "reconcile"> & {
    portfolio?: () => Promise<unknown>;
    revoke?: TradingOrchestrator["revoke"];
};
type Proof = {
    operator: string;
} & Omit<DecisionInput, "operatorId">;
type C = {
    dataDir: string;
    rpc?: Rpc;
    trading?: Trading;
    operatorProof?: (id: string, decision: "approve" | "deny", reason?: string) => Promise<Proof>;
    spawnSigner?: (action: string, args: Record<string, string | boolean>) => Promise<unknown>;
};
export declare function createOperatorDecisionProof(path: string, input: {
    requestId: string;
    operator: string;
    decision: "approve" | "deny";
    challenge: string;
    expectedRevision: number;
    reason?: string;
}): Promise<{
    reason?: string;
    operator: string;
    decision: "approve" | "deny";
    challenge: string;
    nonce: `${string}-${string}-${string}-${string}-${string}`;
    expectedRevision: number;
    timestamp: number;
    proof: string;
}>;
export declare function createUserWorkflow(c: C): (req: UserRequest) => Promise<unknown>;
export declare function httpRpc(url: string, method: string, params: unknown[]): Promise<any>;
export {};
