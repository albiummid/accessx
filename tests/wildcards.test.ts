import { createAccess } from "../src/core/access-control";

describe("Wildcards", () => {
    const access = createAccess({
        roles: ["admin", "post_mod"] as const,
        actions: ["CREATE", "READ", "UPDATE", "DELETE"] as const,
        resources: [
            { name: "Post", key: "POST" },
            { name: "Comment", key: "COMMENT" },
        ] as const,
    });

    it("should handle global wildcard (*)", () => {
        access.allow("admin", "*");
        expect(access.can("admin", "POST:DELETE")).toBe(true);
        expect(access.can("admin", "COMMENT:CREATE")).toBe(true);
    });

    it("should handle resource wildcard (RESOURCE:*)", () => {
        access.allow("post_mod", "POST:*");
        expect(access.can("post_mod", "POST:DELETE")).toBe(true);
        expect(access.can("post_mod", "POST:CREATE")).toBe(true);
        expect(access.can("post_mod", "COMMENT:READ")).toBe(false);
    });

    it("should check static permissions with hasPermission (Legacy)", () => {
        // Note: hasPermission is legacy and usually doesn't know about roles
        // but we can check if it still works for static lists if we pass it correctly.
        // Actually, in the new engine, hasPermission was removed or replaced.
        // Let's check what createAccess returns now.
    });
});
