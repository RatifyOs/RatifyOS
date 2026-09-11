import type { Stats } from "node:fs";
export declare const isWindows: boolean;
/**
 * Map a filesystem-style socket path to the local IPC endpoint for this
 * platform. POSIX systems bind Unix domain sockets at real paths; Windows
 * only supports named pipes, so an absolute path is translated into a
 * pipe name derived from that path (preserving per-directory uniqueness).
 */
export declare function toIpcPath(socketPath: string): string;
/**
 * True when POSIX permission bits are meaningful on this platform.
 * Windows reports synthetic mode bits (group/other mirror the owner), so
 * "no access for group/other" can neither be expressed nor verified via
 * st_mode there; private-file enforcement relies on directory ACLs instead.
 */
export declare const enforcePosixPermissions: boolean;
/**
 * True when `realpath(p) === p` is a sound "no symlink was traversed"
 * check. On POSIX any textual difference proves symlink resolution.
 * Windows aliases the same directory entry under multiple spellings
 * (drive-letter case, 8.3 short names like RUNNER~1), so the textual
 * comparison false-positives there; callers must instead rely on their
 * per-component lstat symlink/junction rejection and continue with the
 * canonical path realpath returned.
 */
export declare const enforceRealpathIdentity: boolean;
/** True when group or other have any access to the inode. */
export declare function permissionsAreUnsafe(stats: Pick<Stats, "mode">): boolean;
/** Read the full contents of an inherited file descriptor, portably. */
export declare function readFd(fd: number): Promise<Buffer>;
