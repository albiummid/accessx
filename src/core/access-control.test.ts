import { Resource } from "../types";
import { createAccess } from "./access-control";

describe("access-control", () => {
    const roles = ["admin", "user"] as const;
    const actions = ["create", "read", "update", "delete"] as const;
    const resources: Resource[] = [
        { name: "Post", key: "post", description: "Blog posts" },
        { name: "User", key: "user", description: "User accounts" },
    ];

    let access = createAccess({ roles, actions, resources });

    beforeEach(() => {
        access = createAccess({ roles, actions, resources });
    });

    it("should initialize with correct roles and resources", () => {
        expect(access.roles).toEqual(roles);
        expect(access.resources).toEqual(resources);
    });

    it("should allow multiple permission assignment to a single role", () => {
        access.allow("user", ["post:create", "user:read"]);
        expect(access.getRolePermissions("user")).toContain("post:create");
        expect(access.getRolePermissions("user")).toContain("user:read");
    });

    it("should correctly check permissions with 'can'", () => {
        access.allow("admin", "*");
        access.allow("user", "post:read");

        // Admin can do anything
        expect(access.can("admin", "post:delete")).toBe(true);
        expect(access.can("admin", "user:create")).toBe(true);

        // User can only read post
        expect(access.can("user", "post:read")).toBe(true);
        expect(access.can("user", "post:create")).toBe(false);
        expect(access.can("user", "user:read")).toBe(false);
    });

    it("should handle wildcards", () => {
        access.allow("user", "post:*");

        expect(access.can("user", "post:create")).toBe(true);
        expect(access.can("user", "post:delete")).toBe(true);
        expect(access.can("user", "user:read")).toBe(false);
    });

    it("should normalize permissions", () => {
        const normalized = access.normalizePermissions([
            "post:read",
            "invalid:action" as any,
        ]);
        expect(normalized).toEqual(["post:read"]);
    });
});
