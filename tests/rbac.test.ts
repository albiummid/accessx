import { createAccess } from "../src/core/access-control";

describe("RBAC - Role Based Access Control", () => {
    const access = createAccess({
        roles: ["admin", "editor", "user", "guest"] as const,
        actions: ["CREATE", "READ", "UPDATE", "DELETE"] as const,
        resources: [
            { name: "Post", key: "POST" },
            { name: "User", key: "USER" },
        ] as const,
    });

    it("should grant single permission correctly", () => {
        access.allow("user", "POST:READ");
        expect(access.can("user", "POST:READ")).toBe(true);
        expect(access.can("user", "POST:CREATE")).toBe(false);
    });

    it("should grant multiple permissions via array", () => {
        access.allow("editor", ["POST:CREATE", "POST:READ", "POST:UPDATE"]);
        expect(access.can("editor", "POST:CREATE")).toBe(true);
        expect(access.can("editor", "POST:READ")).toBe(true);
        expect(access.can("editor", "POST:UPDATE")).toBe(true);
        expect(access.can("editor", "POST:DELETE")).toBe(false);
    });

    it("should handle multi-role checks", () => {
        access.allow("user", "POST:READ");
        access.allow("editor", "POST:UPDATE");

        expect(access.can(["user", "guest"], "POST:READ")).toBe(true);
        expect(access.can(["user", "editor"], "POST:UPDATE")).toBe(true);
        expect(access.can(["user", "guest"], "POST:UPDATE")).toBe(false);
    });

    it("should resolve permissions for a role", () => {
        access.allow("admin", "*");
        expect(access.resolvePermissions("admin")).toEqual(["*"]);
    });

    it("should normalize valid and invalid permissions", () => {
        const raw = ["POST:READ", "INVALID:ACTION", "USER:DELETE"];
        const normalized = access.normalizePermissions(raw);
        expect(normalized).toEqual(["POST:READ", "USER:DELETE"]);
    });
});
