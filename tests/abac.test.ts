import { createAccess } from "../src/core/access-control";

describe("ABAC - Attribute Based Access Control", () => {
    // Define config matching usage
    const config = {
        roles: ["user", "admin"] as const,
        actions: ["UPDATE", "DELETE"] as const,
        resources: [{ name: "Post", key: "POST" }] as const,
    };

    it("should grant permission based on ownership (context)", () => {
        const access = createAccess(config);

        access.allow("user", "POST:UPDATE", (context) => {
            return context.userId === context.postAuthorId;
        });

        const blog = { id: 1, authorId: 100 };
        const user = { id: 100 };

        expect(
            access.can("user", "POST:UPDATE", {
                userId: user.id,
                postAuthorId: blog.authorId,
            })
        ).toBe(true);

        expect(
            access.can("user", "POST:UPDATE", {
                userId: 999,
                postAuthorId: blog.authorId,
            })
        ).toBe(false);
    });

    it("should work with global wildcards and conditions", () => {
        const access = createAccess(config);
        access.allow("admin", "*", (context) => context.isAdmin);

        expect(access.can("admin", "POST:DELETE", { isAdmin: true })).toBe(
            true
        );
        expect(access.can("admin", "POST:DELETE", { isAdmin: false })).toBe(
            false
        );
    });

    it("should work with resource wildcards and conditions", () => {
        const access = createAccess(config);
        access.allow("user", "POST:*", (context) => context.isModerator);

        expect(access.can("user", "POST:DELETE", { isModerator: true })).toBe(
            true
        );
        expect(access.can("user", "POST:UPDATE", { isModerator: false })).toBe(
            false
        );
    });
});
