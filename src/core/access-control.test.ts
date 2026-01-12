import { Resource } from "../types";
import { createAccess } from "./access-control";

describe("access-control", () => {
    const roles = ["admin", "user"] as const;
    const actions = ["create", "read", "update", "delete"] as const;
    const resources: Resource[] = [
        { name: "Post", key: "post", description: "Blog posts" },
        { name: "User", key: "user", description: "User accounts" },
    ];

    const access = createAccess({ roles, actions, resources });

    it("should initialize with correct roles and resources", () => {
        expect(access.roles).toEqual(roles);
        expect(access.resources).toEqual(resources);
    });

    it("should allow permission assignment", () => {
        access.allow("admin", "*");
        access.allow("user", "post:read");

        expect(access.getRolePermissions("admin")).toContain("*");
        expect(access.getRolePermissions("user")).toContain("post:read");
    });

    it("should correctly check permissions with 'can'", () => {
        // Already allowed in previous test but let's be explicit
        const adminPerms = ["*"] as const;
        const userPerms = ["post:read"] as const;

        // Admin can do anything
        expect(access.hasPermission([...adminPerms], "post:delete")).toBe(true);
        expect(access.hasPermission([...adminPerms], "user:create")).toBe(true);

        // User can only read post
        expect(access.hasPermission([...userPerms], "post:read")).toBe(true);
        expect(access.hasPermission([...userPerms], "post:create")).toBe(false);
        expect(access.hasPermission([...userPerms], "user:read")).toBe(false);
    });

    it("should handle wildcards", () => {
        const postModeratorPerms = ["post:*"] as any[];

        expect(access.hasPermission(postModeratorPerms, "post:create")).toBe(
            true
        );
        expect(access.hasPermission(postModeratorPerms, "post:delete")).toBe(
            true
        );
        expect(access.hasPermission(postModeratorPerms, "user:read")).toBe(
            false
        );
    });

    it("should normalize permissions", () => {
        const normalized = access.normalizePermissions([
            "post:read",
            "invalid:action" as any,
        ]);
        expect(normalized).toEqual(["post:read"]);
    });
});
