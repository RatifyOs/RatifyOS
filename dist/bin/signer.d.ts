#!/usr/bin/env node
export declare const VERSION = "0.1.0";
export declare function createSignerWireConfig(authKey: string, audience: string, keyId: string | undefined, policy: {
    hash: string;
    version: number;
    cluster: string;
}): {
    policyHash: string;
    policyVersion: number;
    signerKeyId?: string;
    authorizationKeyIds?: string[];
    audience: string;
    cluster: string;
    verifier: {
        verify: (d: string, s: string, claimedKeyId?: string) => Promise<boolean>;
    };
};
export declare function main(argv?: string[]): Promise<void>;
