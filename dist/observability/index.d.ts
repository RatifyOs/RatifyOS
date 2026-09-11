export type Correlation = {
    runId?: string;
    sessionId?: string;
    toolId?: string;
    intentId?: string;
    policyId?: string;
    simulationId?: string;
    approvalId?: string;
    txId?: string;
};
export interface ObservabilityEvent {
    name: string;
    timestamp: number;
    correlation: Correlation;
    attributes: Record<string, unknown>;
}
export declare class SecureEventLogger {
    private sink;
    private options;
    constructor(sink: (e: ObservabilityEvent) => void, options?: {
        maxFields?: number;
        maxValueLength?: number;
        now?: () => number;
    });
    emit(name: string, correlation?: Correlation, attributes?: Record<string, unknown>): void;
    startSpan(name: string, correlation?: Correlation): {
        setAttribute: (k: string, v: unknown) => void;
        end: () => void;
    };
}
declare class Counter {
    private r;
    private n;
    constructor(r: MetricRegistry, n: string);
    add(v?: number, l?: Record<string, string>): void;
}
export declare class MetricRegistry {
    private options;
    private values;
    private cardinality;
    constructor(options?: {
        maxLabelValues?: number;
    });
    counter(name: string): Counter;
    add(n: string, v: number, l: Record<string, string>): void;
    expose(): string;
}
export type HealthKind = "liveness" | "readiness";
export declare class HealthRegistry {
    private checks;
    register(name: string, kind: HealthKind, check: () => boolean | Promise<boolean>): void;
    check(kind: HealthKind): Promise<{
        ok: boolean;
        kind: HealthKind;
        dependencies: Record<string, "unhealthy" | "healthy">;
    }>;
}
export interface AuditRoot {
    root: string;
    leafCount: number;
    createdAt: number;
}
export interface ImmutableAuditSink {
    append(root: Readonly<AuditRoot>): Promise<void>;
}
export declare class AuditRootBatcher {
    private sink;
    private size;
    private now;
    private leaves;
    constructor(sink: ImmutableAuditSink, size?: number, now?: () => number);
    add(event: unknown): Promise<Readonly<{
        root: string;
        leafCount: number;
        createdAt: number;
    }> | undefined>;
    flush(): Promise<Readonly<{
        root: string;
        leafCount: number;
        createdAt: number;
    }> | undefined>;
}
export interface AlertSnapshot {
    killSwitch?: boolean;
    policyDenials?: number;
    nonceGap?: number;
    stuckTxSeconds?: number;
    rpcDisagreement?: boolean;
    reorgDepth?: number;
    signerErrors?: number;
    simulationDivergence?: boolean;
}
export interface Alert {
    code: string;
    severity: "critical" | "warning";
}
export declare function evaluateAlerts(s: AlertSnapshot, t?: {
    policyDenialThreshold?: number;
    stuckTxSeconds?: number;
}): Alert[];
export {};
