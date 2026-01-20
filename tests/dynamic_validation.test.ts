import { createEngine } from "../src/core/engine";
import { Resource } from "../src/types";

const resources: Resource[] = [{ name: "Blog", key: "BLOG" }];

const config = {
    roles: ["USER"] as const,
    actions: ["READ", "UPDATE"] as const,
    resources,
};

describe("Dynamic Validation in access.can", () => {
    let access: any;

    beforeEach(() => {
        access = createEngine(config);
    });

    test("should allow when permission exists and validator returns true", () => {
        access.allow("USER", "BLOG:UPDATE");

        const result = access.can("USER", "BLOG:UPDATE", () => {
            return true;
        });

        expect(result).toBe(true);
    });

    test("should deny when permission exists but validator returns false", () => {
        access.allow("USER", "BLOG:UPDATE");

        const result = access.can("USER", "BLOG:UPDATE", () => {
            return false;
        });

        expect(result).toBe(false);
    });

    test("should deny when permission does not exist even if validator returns true", () => {
        // No permission assigned
        const result = access.can("USER", "BLOG:UPDATE", () => {
            return true; // Validator says yes
        });

        // But RBAC says no
        expect(result).toBe(false);
    });

    test("should maintain backward compatibility for stored conditions (deprecated)", () => {
        // Old style: usage of context
        access.allow("USER", "BLOG:READ", (ctx: any) => ctx.userId === 1);

        const allowed = access.can("USER", "BLOG:READ", { userId: 1 });
        const denied = access.can("USER", "BLOG:READ", { userId: 2 });

        expect(allowed).toBe(true);
        expect(denied).toBe(false);
    });

    test("should work with no 3rd argument (basic RBAC)", () => {
        access.allow("USER", "BLOG:READ");
        expect(access.can("USER", "BLOG:READ")).toBe(true);
    });
});
