import { z } from "zod";
declare const schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    version: z.ZodString;
    package: z.ZodObject<{
        sha256: z.ZodString;
        provenance: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        sha256: string;
        provenance: string;
    }, {
        sha256: string;
        provenance: string;
    }>;
    compatibility: z.ZodObject<{
        agent: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        agent: string;
    }, {
        node: string;
        agent: string;
    }>;
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        effect: z.ZodEnum<["read", "write", "external"]>;
        capabilities: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
    }, "strict", z.ZodTypeAny, {
        name: string;
        effect: "read" | "write" | "external";
        capabilities: string[];
    }, {
        name: string;
        effect: "read" | "write" | "external";
        capabilities: string[];
    }>, "many">;
    permissions: z.ZodObject<{
        filesystem: z.ZodObject<{
            read: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
            write: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        }, "strict", z.ZodTypeAny, {
            read: string[];
            write: string[];
        }, {
            read: string[];
            write: string[];
        }>;
        network: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            port: z.ZodNumber;
            tls: z.ZodLiteral<true>;
        }, "strict", z.ZodTypeAny, {
            port: number;
            hostname: string;
            tls: true;
        }, {
            port: number;
            hostname: string;
            tls: true;
        }>, "many">;
        env: z.ZodArray<z.ZodString, "many">;
    }, "strict", z.ZodTypeAny, {
        network: {
            port: number;
            hostname: string;
            tls: true;
        }[];
        env: string[];
        filesystem: {
            read: string[];
            write: string[];
        };
    }, {
        network: {
            port: number;
            hostname: string;
            tls: true;
        }[];
        env: string[];
        filesystem: {
            read: string[];
            write: string[];
        };
    }>;
    resources: z.ZodObject<{
        cpuMs: z.ZodNumber;
        memoryMb: z.ZodNumber;
        timeoutMs: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        cpuMs: number;
        memoryMb: number;
        timeoutMs: number;
    }, {
        cpuMs: number;
        memoryMb: number;
        timeoutMs: number;
    }>;
}, "strict", z.ZodTypeAny, {
    tools: {
        name: string;
        effect: "read" | "write" | "external";
        capabilities: string[];
    }[];
    id: string;
    version: string;
    schemaVersion: 1;
    package: {
        sha256: string;
        provenance: string;
    };
    compatibility: {
        node: string;
        agent: string;
    };
    permissions: {
        network: {
            port: number;
            hostname: string;
            tls: true;
        }[];
        env: string[];
        filesystem: {
            read: string[];
            write: string[];
        };
    };
    resources: {
        cpuMs: number;
        memoryMb: number;
        timeoutMs: number;
    };
}, {
    tools: {
        name: string;
        effect: "read" | "write" | "external";
        capabilities: string[];
    }[];
    id: string;
    version: string;
    schemaVersion: 1;
    package: {
        sha256: string;
        provenance: string;
    };
    compatibility: {
        node: string;
        agent: string;
    };
    permissions: {
        network: {
            port: number;
            hostname: string;
            tls: true;
        }[];
        env: string[];
        filesystem: {
            read: string[];
            write: string[];
        };
    };
    resources: {
        cpuMs: number;
        memoryMb: number;
        timeoutMs: number;
    };
}>;
export type PluginManifest = z.infer<typeof schema>;
export declare function parsePluginManifest(input: unknown): PluginManifest;
export declare function canonicalManifest(input: unknown): string;
export interface ArchiveEntry {
    path: string;
    data: Buffer;
    type?: "file" | "symlink" | "directory";
}
export declare class PluginInstaller {
    private o;
    constructor(o: {
        root: string;
        verifySignature: (payload: Buffer, signature: Buffer) => boolean | Promise<boolean>;
        limits?: {
            maxFiles: number;
            maxUnpackedBytes: number;
        };
    });
    install(i: {
        manifest: unknown;
        signature: Buffer;
        packageBytes: Buffer;
        entries: ArchiveEntry[];
    }): Promise<{
        id: string;
        version: string;
        path: string;
        checksum: string;
    }>;
}
export interface PluginWorker {
    invoke(tool: string, input: unknown, signal?: AbortSignal): Promise<unknown>;
    terminate(): Promise<void> | void;
}
type Request = {
    capability: string;
    operation: string;
    input: unknown;
};
export declare class PluginHost {
    private o;
    private crashes;
    constructor(o: {
        spawn: (options: {
            manifest: PluginManifest;
            env: Record<string, string>;
            cwd: string;
            resources: PluginManifest["resources"];
        }) => Promise<PluginWorker>;
        env?: Record<string, string | undefined>;
        mediate: (request: Request, manifest: PluginManifest) => Promise<unknown>;
        quarantineThreshold?: number;
    });
    isQuarantined(id: string): boolean;
    start(m: PluginManifest): Promise<{
        request: (r: Request) => Promise<unknown>;
        invoke: (tool: string, input: unknown, signal?: AbortSignal) => Promise<unknown>;
        close: () => Promise<void>;
    }>;
}
export {};
