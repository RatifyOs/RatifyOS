import type { JupiterBuildArgs, JupiterClient as IJupiterClient, JupiterQuoteArgs, JupQuote, SwapBuild } from "../../kernel/contracts.js";
/** Jupiter quote→swap with self-RPC landing (the kernel owns the blockhash lifecycle). */
export declare class JupiterClient implements IJupiterClient {
    #private;
    constructor(opts?: {
        baseUrl?: string;
        apiKey?: string;
    });
    quote(args: JupiterQuoteArgs): Promise<JupQuote>;
    buildSwap(args: JupiterBuildArgs): Promise<SwapBuild>;
}
