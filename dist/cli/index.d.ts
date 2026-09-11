export type UserRequest = {
    group: "setup" | "wallet" | "portfolio" | "trade" | "signer";
    action: string;
    args: Record<string, string | boolean>;
};
export type CliCommand = {
    name: "chat";
    message: string;
    sessionId?: string;
} | {
    name: "simulate";
    input: unknown;
} | {
    name: "status" | "sessions" | "tools" | "skills" | "markets" | "jobs";
} | ({
    name: "user";
} & UserRequest);
export interface CliServices {
    chat(x: {
        message: string;
        sessionId?: string;
    }): unknown;
    status(): unknown;
    sessions(): unknown;
    tools(): unknown;
    skills(): unknown;
    markets(): unknown;
    simulate(x: unknown): unknown;
    jobs(): unknown;
    user(x: UserRequest): unknown;
}
export declare function parseCommand(argv: string[]): CliCommand;
export declare function runCli(argv: string[], services: CliServices, write?: (text: string) => void): Promise<1 | 0>;
