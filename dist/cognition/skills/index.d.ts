export type SkillSource = "workspace" | "local" | "bundled";
export interface SkillReadiness {
    ready: boolean;
    missingEnv: string[];
    missingBinaries: string[];
    missingConfig: string[];
}
export interface SkillMetadata {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly checksum: string;
    readonly source: SkillSource;
    readonly capabilities: string[];
    readonly readiness: SkillReadiness;
}
export interface LoadedSkill extends SkillMetadata {
    readonly content: string;
    readonly suspicious: string[];
}
type Roots = Partial<Record<SkillSource, string>>;
export declare class SkillManager {
    private readonly roots;
    private readonly env;
    private readonly config;
    private readonly controlledRoot;
    constructor(options: {
        roots: Roots;
        env?: Record<string, string | undefined>;
        config?: unknown;
        controlledRoot?: string;
    });
    private selected;
    private metadata;
    discover(): Promise<{
        name: string;
        description: string;
        version: string;
        checksum: string;
        source: SkillSource;
        capabilities: string[];
        readiness: {
            ready: boolean;
            missingEnv: string[];
            missingBinaries: string[];
            missingConfig: string[];
        };
    }[]>;
    load(name: string, pin?: {
        version?: string;
        checksum?: string;
    }): Promise<LoadedSkill>;
    loadFile(name: string, path: string): Promise<string>;
    private controlled;
    create(name: string, text: string, files?: Record<string, string>): Promise<{
        name: string;
        description: string;
        version: string;
        checksum: string;
        source: SkillSource;
        capabilities: string[];
        readiness: {
            ready: boolean;
            missingEnv: string[];
            missingBinaries: string[];
            missingConfig: string[];
        };
    }>;
    update(name: string, text: string, options?: {
        expectedChecksum?: string;
        files?: Record<string, string>;
    }): Promise<{
        name: string;
        description: string;
        version: string;
        checksum: string;
        source: SkillSource;
        capabilities: string[];
        readiness: {
            ready: boolean;
            missingEnv: string[];
            missingBinaries: string[];
            missingConfig: string[];
        };
    }>;
    private writeTree;
}
export {};
