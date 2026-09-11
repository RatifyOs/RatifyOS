import { type McpServer } from "./sdk.js";
/**
 * Connect an MCP server to stdio and keep it running.
 *
 * The client (Claude Code, Cursor, …) spawns this process and speaks JSON-RPC
 * over stdin/stdout. **stdout is the protocol channel**: every diagnostic,
 * every log line, every warning must go to stderr via `console.error`. One
 * `console.log` anywhere in the process — including inside a tool — inserts a
 * non-JSON-RPC line into the stream and the client desynchronises.
 *
 * Resolves when the transport closes.
 */
export declare function runStdio(server: McpServer): Promise<void>;
