export interface SelfcheckCheck {
    readonly name: string;
    readonly ok: boolean;
    readonly detail: string;
}
export interface SelfcheckReport {
    readonly total: number;
    readonly failures: number;
    readonly checks: readonly SelfcheckCheck[];
}
/**
 * Drive the chokepoint over synthetic state and assert every kernel invariant.
 * Never throws for a failing invariant — the report carries the outcome.
 */
export declare function runSelfcheck(): Promise<SelfcheckReport>;
/** Print the report. Kept out of {@link runSelfcheck} so the harness stays silent under vitest. */
export declare function printSelfcheck(report: SelfcheckReport): void;
