import { createAccess } from "../src/core/access-control";
import { Resource } from "../src/types";

describe("ABAC (Attribute-Based Access Control)", () => {
    const roles = ["admin", "user"] as const;
    const actions = ["create", "read", "update", "delete"] as const;
    const resources: Resource[] = [
        { name: "Post", key: "post", description: "Blog posts" },
    ];

    const access = createAccess({ roles, actions, resources });

    interface Post {
        id: string;
        authorId: string;
        title: string;
    }

    interface User {
        id: string;
        name: string;
    }

    it("should handle conditional permissions", () => {
        // Define ABAC rule: user can only update their own post
        access.allow(
            "user",
            "post:update",
            (context: { user: User; post: Post }) => {
                return context.post.authorId === context.user.id;
            },
        );

        const user1 = { id: "u1", name: "Alice" };
        const user2 = { id: "u2", name: "Bob" };
        const post1 = { id: "p1", authorId: "u1", title: "Alice's Post" };

        // Alice can update her own post
        expect(
            access.can("user", "post:update", { user: user1, post: post1 }),
        ).toBe(true);

        // Bob cannot update Alice's post
        expect(
            access.can("user", "post:update", { user: user2, post: post1 }),
        ).toBe(false);
    });

    it("should handle global wildcards with conditions", () => {
        access.allow("admin", "*", (context: { secret: string }) => {
            return context.secret === "magic";
        });

        expect(access.can("admin", "post:delete", { secret: "magic" })).toBe(
            true,
        );
        expect(access.can("admin", "post:delete", { secret: "wrong" })).toBe(
            false,
        );
    });

    it("should handle resource wildcards with conditions", () => {
        access.allow("user", "post:*", (context: { count: number }) => {
            return context.count < 5;
        });

        expect(access.can("user", "post:create", { count: 3 })).toBe(true);
        expect(access.can("user", "post:read", { count: 10 })).toBe(false);
    });

    it("should return false if no role is found", () => {
        expect(access.can("non-existent" as any, "post:read")).toBe(false);
    });
});
