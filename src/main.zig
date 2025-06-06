const std = @import("std");
const allocator = std.heap.wasm_allocator;
const Sha256 = std.crypto.hash.sha2.Sha256;

/// Buffer with challenge + nonce
var seed: []u8 = undefined;

/// SHA-256 digest of `seed`
var hash: []u8 = undefined;

/// Return Wasm memory address of `seed`
export fn getSeed() [*]const u8 {
    return @ptrCast(seed);
}

/// Return Wasm memory address of `hash`
export fn getHash() [*]const u8 {
    return @ptrCast(hash);
}

/// Entry point to allocate initial memory
export fn init() void {
    // Wasm is 32-bit
    seed = allocator.alloc(u8, 32 + @sizeOf(usize)) catch unreachable;
    hash = allocator.alloc(u8, 32) catch unreachable;
}

/// Calculate proof-of-work solution.
/// Seed memory must be written first.
/// Difficulty is number of leading zero bits.
/// Returns correct nonce value for difficulty.
export fn solve(difficulty: usize) usize {
    // Slice pointer to write nonce
    const nonce = seed[32..(32 + @sizeOf(usize))];
    // Iterate from one (zero means failure)
    work: for (1..std.math.maxInt(usize)) |i| {
        // Update nonce
        std.mem.writeInt(usize, nonce, i, .little);
        // Hash new challenge + nonce
        var sha = Sha256.init(.{});
        sha.update(seed);
        sha.final(hash[0..32]);
        // Count required number of leading zero bits
        for (0..difficulty) |d| {
            const byte: u8 = hash[@divFloor(d, 8)];
            const bit: u3 = @intCast(@mod(d, 8));
            if ((byte & (@as(u8, 1) << bit)) != 0) {
                continue :work;
            }
        }
        return i;
    }
    // Should it give up at some point?
    unreachable;
    // return 0;
}
