#!/usr/bin/env node
import { type CliServices } from "../cli/index.js";
export declare function resolveInputArgument(arg: string, stdin?: () => Promise<string>): Promise<unknown>;
export declare function createRemoteServices(base: string, token?: string, fetchFn?: typeof fetch, dataDir?: string): CliServices;
export declare function main(argv?: string[]): Promise<1 | 0>;
