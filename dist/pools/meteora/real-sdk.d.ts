import { Connection } from "@solana/web3.js";
import { type DlmmPoolHandle, type DlmmSdk, type SdkPosition } from "./sdk-port.js";
export declare class RealDlmmSdk implements DlmmSdk {
    #private;
    constructor(connectionOrUrl: Connection | string);
    openPool(poolAddress: string): Promise<DlmmPoolHandle>;
    positionsOfUser(owner: string): Promise<readonly {
        pool: string;
        position: SdkPosition;
    }[]>;
}
