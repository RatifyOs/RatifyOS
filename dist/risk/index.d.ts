export interface RiskInput {
    token: {
        address: string;
        verified?: boolean;
        isProxy?: boolean;
        name?: string;
        symbol?: string;
    };
    holders?: Array<{
        address: string;
        share: number;
    }>;
    liquidityUsd?: number;
    pairCreatedAt?: number;
    restrictions?: {
        buyRestricted?: boolean;
        sellRestricted?: boolean;
        buyTaxPercent?: number;
        sellTaxPercent?: number;
    };
    sources?: Array<{
        source: string;
        priceUsd?: number;
    }>;
}
export interface RiskFactor {
    code: string;
    severity: "low" | "medium" | "high" | "critical";
    points: number;
    evidence: string;
}
export interface RiskReport {
    score: number;
    level: "low" | "medium" | "high" | "critical";
    confidence: number;
    honeypot: "unverified";
    factors: RiskFactor[];
    provenance: Array<{
        source: string;
        priceUsd?: number;
    }>;
    disclaimer: string;
}
export declare function analyzeRisk(i: RiskInput, options?: {
    now?: number;
}): RiskReport;
