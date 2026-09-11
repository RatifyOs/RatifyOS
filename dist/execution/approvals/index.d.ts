import { DatabaseSync } from "node:sqlite";
export type ApprovalType = "sign" | "broadcast" | "allowance" | "bridge" | "withdraw" | "policy-change";
export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "revoked" | "consumed";
export interface ApprovalRequestInput {
    id: string;
    type: ApprovalType;
    proposerId: string;
    chain: string;
    serializedTransaction: unknown;
    intentHash: string;
    policyHash: string;
    policyVersion: string;
    simulationHash: string;
    simulationBlock: string;
    simulationState: string;
    account: string;
    nonce: string;
    value: string;
    calldata: string;
    router: string;
    expiresAt: number;
    displayImpact?: string;
}
export interface Operator {
    id: string;
    roles: string[];
    scopes: string[];
}
export interface ApprovalRecord extends ApprovalRequestInput {
    transactionHash: string;
    status: ApprovalStatus;
    revision: number;
    quorum: number;
    challenge: string;
    createdAt: number;
}
export interface BoundTransaction {
    chain: string;
    serializedTransaction: unknown;
    intentHash: string;
    policyHash: string;
    policyVersion: string;
    simulationHash: string;
    simulationBlock: string;
    simulationState: string;
    account: string;
    nonce: string;
    value: string;
    calldata: string;
    router: string;
}
export interface DecisionInput {
    operatorId: string;
    decision: "approve" | "deny";
    challenge: string;
    nonce: string;
    expectedRevision: number;
    timestamp?: number;
    proof?: string;
    reason?: string;
}
export interface DecisionProof extends DecisionInput {
    requestId: string;
    revision: number;
    timestamp: number;
    operatorConfigVersion: string;
    operatorConfigHash: string;
}
export interface AuditEvent {
    event: string;
    operatorId?: string;
    reason?: string;
    bindingHash: string;
    revision: number;
    createdAt: number;
}
type Row = Record<string, unknown>;
export declare function canonicalSerialize(v: unknown, seen?: Set<object>): string;
export declare const canonicalHash: (v: unknown) => string;
export declare class ApprovalEngine {
    private db;
    private clock;
    private operators;
    private closed;
    private verify;
    private configVersion;
    private configHash;
    constructor(path: string, options: {
        clock?: () => number;
        operators: Operator[];
        operatorConfigVersion?: string;
        verifyDecisionProof?: (p: DecisionProof) => boolean;
    });
    private open;
    private raw;
    private validate;
    request(input: ApprovalRequestInput, options: {
        quorum: number;
    }): ApprovalRecord;
    private event;
    private map;
    private expire;
    get(id: string): ApprovalRecord | undefined;
    private operator;
    decide(id: string, input: DecisionInput): ApprovalRecord;
    decisions(id: string): Row[];
    audit(id: string): AuditEvent[];
    revoke(id: string, input: {
        operatorId: string;
        reason: string;
        expectedRevision: number;
    }): ApprovalRecord;
    consume(id: string, input: BoundTransaction): ApprovalRecord;
    unsafeDatabaseForTests(): DatabaseSync;
    close(): void;
}
export {};
