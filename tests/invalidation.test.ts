import { createAccess } from "../src/core/access-control";

describe("Permission Invalidation & Refresh", () => {
    // We cast the config to any to allow flexible testing without strict engine type constraints if needed,
    // though the implementation should ideally handle it.
    const config: any = {
        roles: ["admin", "user"] as const,
        actions: ["READ", "WRITE"] as const,
        resources: [{ name: "Post", key: "POST" }] as const,
    };

    it("should refresh permissions when invalidateKey changes (manual refresh)", async () => {
        const access = createAccess(config);
        let version = "v1";
        const fetcher = jest.fn(async () => {
            return (
                version === "v1" ? ["POST:READ"] : ["POST:READ", "POST:WRITE"]
            ) as any;
        });

        const keyFetcher = jest.fn(async () => version);

        await access.assignPermissions("user", fetcher, {
            invalidateKey: keyFetcher,
        });

        expect(access.can("user", "POST:READ")).toBe(true);
        expect(access.can("user", "POST:WRITE")).toBe(false);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(keyFetcher).toHaveBeenCalledTimes(1);

        // Change version but don't refresh yet
        version = "v2";
        expect(access.can("user", "POST:WRITE")).toBe(false);

        // Manual refresh
        await access.refresh("user");

        expect(access.can("user", "POST:WRITE")).toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(keyFetcher).toHaveBeenCalledTimes(2);
    });

    it("should NOT refresh if invalidateKey is the same", async () => {
        const access = createAccess(config);
        const fetcher = jest.fn(async () => ["POST:READ"] as any);
        const keyFetcher = jest.fn(async () => "stable-key");

        await access.assignPermissions("user", fetcher, {
            invalidateKey: keyFetcher,
        });

        expect(fetcher).toHaveBeenCalledTimes(1);

        await access.refresh("user");

        expect(fetcher).toHaveBeenCalledTimes(1); // Should not be called again
        expect(keyFetcher).toHaveBeenCalledTimes(2);
    });

    it("should auto-refresh using interval", async () => {
        jest.useFakeTimers();
        const access = createAccess(config);
        let version = "v1";
        const fetcher = jest.fn(async () => {
            return (version === "v1" ? ["POST:READ"] : ["POST:WRITE"]) as any;
        });

        await access.assignPermissions("user", fetcher, {
            invalidateKey: () => Promise.resolve(version),
            interval: 100,
        });

        expect(access.can("user", "POST:READ")).toBe(true);

        version = "v2";

        // Fast-forward time
        jest.advanceTimersByTime(200);

        // Wait for async operations
        await Promise.resolve();
        await Promise.resolve();

        expect(access.can("user", "POST:WRITE")).toBe(true);
        expect(access.can("user", "POST:READ")).toBe(false);

        jest.useRealTimers();
    });

    it("should isolate permissions between multiple assignments", async () => {
        const access = createAccess(config);

        // Assignment 1: Static
        await access.assignPermissions("user", ["POST:READ"] as any);

        // Assignment 2: Dynamic
        let version = "v1";
        const fetcher = async () =>
            (version === "v1" ? [] : ["POST:WRITE"]) as any;

        await access.assignPermissions("user", fetcher, {
            invalidateKey: () => Promise.resolve(version),
        });

        expect(access.can("user", "POST:READ")).toBe(true);
        expect(access.can("user", "POST:WRITE")).toBe(false);

        version = "v2";
        await access.refresh("user");

        // Assignment 1 should still be there, Assignment 2 should be updated
        expect(access.can("user", "POST:READ")).toBe(true);
        expect(access.can("user", "POST:WRITE")).toBe(true);
    });
});
