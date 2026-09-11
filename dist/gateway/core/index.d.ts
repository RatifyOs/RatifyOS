import { z } from "zod";
export declare const requestFrameSchema: z.ZodObject<{
    kind: z.ZodLiteral<"request">;
    method: z.ZodString;
    idempotencyKey: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    params: z.ZodUnknown;
    version: z.ZodString;
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "request";
    id: string;
    version: string;
    method: string;
    idempotencyKey: string;
    params?: unknown;
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    kind: "request";
    id: string;
    version: string;
    method: string;
    idempotencyKey: string;
    params?: unknown;
    sessionId?: string | undefined;
    runId?: string | undefined;
}>;
export declare const responseFrameSchema: z.ZodEffects<z.ZodObject<{
    kind: z.ZodLiteral<"response">;
    ok: z.ZodBoolean;
    result: z.ZodOptional<z.ZodUnknown>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strict", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
    }, {
        code: string;
        message: string;
        details?: unknown;
    }>>;
    version: z.ZodString;
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "response";
    id: string;
    version: string;
    ok: boolean;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
    result?: unknown;
}, {
    kind: "response";
    id: string;
    version: string;
    ok: boolean;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
    result?: unknown;
}>, {
    kind: "response";
    id: string;
    version: string;
    ok: boolean;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
    result?: unknown;
}, {
    kind: "response";
    id: string;
    version: string;
    ok: boolean;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
    result?: unknown;
}>;
export declare const eventFrameSchema: z.ZodObject<{
    kind: z.ZodLiteral<"event">;
    event: z.ZodString;
    sequence: z.ZodNumber;
    sessionId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    payload: z.ZodUnknown;
    version: z.ZodString;
    id: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "event";
    id: string;
    version: string;
    sequence: number;
    event: string;
    payload?: unknown;
    sessionId?: string | undefined;
    runId?: string | undefined;
}, {
    kind: "event";
    id: string;
    version: string;
    sequence: number;
    event: string;
    payload?: unknown;
    sessionId?: string | undefined;
    runId?: string | undefined;
}>;
export type RequestFrame = z.infer<typeof requestFrameSchema>;
export type ResponseFrame = z.infer<typeof responseFrameSchema>;
export type EventFrame = z.infer<typeof eventFrameSchema>;
export declare const gatewayFrameJsonSchemas: {
    request: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
    response: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
    event: import("zod-to-json-schema").JsonSchema7Type & {
        $schema?: string | undefined;
        definitions?: {
            [key: string]: import("zod-to-json-schema").JsonSchema7Type;
        } | undefined;
    };
};
export interface Principal {
    readonly id: string;
    readonly roles: readonly string[];
    readonly scopes: readonly string[];
    readonly capabilities: readonly string[];
}
export interface AuthVerifier {
    verify(credential: string): Promise<Principal | null>;
}
export interface PairingRecord {
    deviceId: string;
    principalId: string;
    state: "pending" | "paired" | "revoked";
}
export interface PairingStore {
    get(deviceId: string): Promise<PairingRecord | null>;
}
export interface AuthInput {
    credential: string;
    deviceId?: string;
}
export interface GatewayContext {
    principal: Principal;
    device?: PairingRecord;
}
export interface AuthorizationRequirement {
    roles?: readonly string[];
    scopes?: readonly string[];
    capabilities?: readonly string[];
}
export declare class GatewayError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, details?: unknown | undefined);
}
export declare const canonicalRunId: (value?: string) => string;
export declare const canonicalSessionId: (value?: string) => string;
export interface ChannelRoute {
    agentId?: string;
    accountId?: string;
    peerId?: string;
    threadId?: string;
}
export declare function routingKey(route: ChannelRoute): string;
type Handler = (request: RequestFrame, context: GatewayContext) => unknown | Promise<unknown>;
export interface GatewayConfig {
    verifier: AuthVerifier;
    pairingStore: PairingStore;
    supportedVersions: readonly string[];
    maxRequestBytes: number;
    now?: () => Date;
}
export declare class GatewayCore {
    private config;
    private handlers;
    private idempotency;
    private sessions;
    private started;
    constructor(config: GatewayConfig);
    negotiate(offered: readonly string[]): string;
    authenticate(input: AuthInput): Promise<GatewayContext>;
    authorize(context: GatewayContext, requirements: AuthorizationRequirement): void;
    claimSession(context: GatewayContext, sessionId: string, accountId: string): void;
    assertSessionAccess(context: GatewayContext, sessionId: string, accountId: string): void;
    register(method: string, handler: Handler): void;
    handle(raw: unknown, auth: AuthInput): Promise<ResponseFrame>;
    health(): {
        status: "ok";
        transport: "in-process";
        supportedVersions: string[];
        maxRequestBytes: number;
        uptimeMs: number;
        registeredMethods: number;
    };
}
export {};
