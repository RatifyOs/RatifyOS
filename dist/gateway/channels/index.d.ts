export interface ReplyRoute {
    chatId: string;
    threadId?: string;
}
export interface ApprovalCommand {
    type: "approval";
    action: "approve" | "reject";
    approvalId: string;
}
export interface InboundEnvelope {
    id: string;
    channel: string;
    text: string;
    sessionKey: string;
    replyTo: ReplyRoute;
    actor: {
        id: string;
        username?: string;
    };
    receivedAt: number;
    command?: ApprovalCommand;
    raw: unknown;
}
export interface OutboundEnvelope {
    channel: string;
    route: ReplyRoute;
    text: string;
}
export interface ChannelAdapter {
    receive(input: unknown): Promise<InboundEnvelope | undefined>;
    send(output: OutboundEnvelope): Promise<void>;
}
export declare const sessionKey: (channel: string, conversationId: string, threadId?: string) => string;
export declare function chunkTelegramText(text: string, max?: number): string[];
type Fetch = (url: string, init: {
    method: string;
    headers: Record<string, string>;
    body: string;
}) => Promise<{
    ok: boolean;
    json(): Promise<unknown>;
}>;
export declare class TelegramChannel implements ChannelAdapter {
    private seen;
    private fetch;
    private authorize;
    private token;
    private max;
    constructor(o: {
        token?: string;
        fetch: Fetch;
        authorize: (x: {
            userId: string;
            chatId: string;
            username?: string;
        }) => boolean | Promise<boolean>;
        maxMessageLength?: number;
    });
    receive(input: unknown): Promise<{
        raw: object;
        command?: {
            type: "approval";
            action: "approve" | "reject";
            approvalId: string;
        };
        id: string;
        channel: string;
        text: string;
        sessionKey: string;
        replyTo: ReplyRoute;
        actor: {
            username?: string;
            id: string;
        };
        receivedAt: number;
    } | undefined>;
    send(o: OutboundEnvelope): Promise<void>;
}
export {};
