# @lbstack/accessx

A **TypeScript-first RBAC permission engine** with **automatic permission generation**, designed to be the **single source of truth** for:

-   Backend authorization
-   Frontend UI access control
-   Database permission storage
-   Admin permission management

No manual permission strings.  
No role leakage to frontend.  
Full autocomplete everywhere.

---

## ✨ Key Features

-   🔐 **Automatic permission generation**
-   🧠 **Strong TypeScript inference & autocomplete**
-   🏗️ **Single initialization – use everywhere**
-   🖥️ Backend (Express / Nest / Hono)
-   🎨 Frontend (React hooks & components)
-   🗄️ Database-friendly permission keys
-   📦 Package & framework agnostic

---

## 🧩 Core Concept

You define:

-   **Roles**
-   **Actions**
-   **Resources (modules)**

The package automatically generates permissions in this format:

RESOURCE_KEY:ACTION

Example:

BLOGS:CREATE
BLOGS:READ
USER:DELETE

These permission keys are:

-   Stored in DB
-   Sent to frontend after login
-   Used in UI & API checks
-   Fully type-safe

---

## 📦 Installation

```bash
npm install @lbstack/accessx


or

pnpm add @lbstack/accessx

🚀 Initialization (Single Source of Truth)
import { createAccess } from "@lbstack/accessx";

export const access = createAccess({
  roles: ["ADMIN", "EDITOR", "CUSTOMER"] as const,

  actions: ["CREATE", "READ", "UPDATE", "DELETE"] as const,

  resources: [
    {
      name: "Users",
      key: "USER",
      description: "User management",
    },
    {
      name: "Blogs",
      key: "BLOGS",
      description: "Blog posts",
    },
  ] as const,
});


⚠️ as const is required for TypeScript autocomplete.

🔑 Automatically Generated Permissions
access.permissionKeys

[
  "USER:CREATE",
  "USER:READ",
  "USER:UPDATE",
  "USER:DELETE",
  "BLOGS:CREATE",
  "BLOGS:READ",
  "BLOGS:UPDATE",
  "BLOGS:DELETE",
]


No permission strings are written manually.

🗄️ Database Usage
Seed permissions table
await db.permissions.insertMany(access.permissions);


Each permission contains metadata:

{
  key: "BLOGS:CREATE",
  resource: { name, key, description },
  action: "CREATE"
}

🔐 Backend Usage
Assign permissions to roles
access.allow("ADMIN", "USER:DELETE");
access.allow("EDITOR", "BLOGS:CREATE");

Check permission (Service / Controller)
access.can(user.role, "BLOGS:UPDATE");

Normalize permissions from DB
const permissionsFromDb = ["BLOGS:READ", "USER:DELETE"];

const permissions = access.normalizePermissions(permissionsFromDb);


Ensures only valid generated permissions are used.

Login Response
res.json({
  user,
  permissions: access.resolvePermissions(user.role),
});

🎨 Frontend Usage (React)

Frontend never uses roles.
It only receives resolved permissions.

useCan Hook
const canEdit = access.useCan(
  auth.permissions,
  "BLOGS:UPDATE"
);

<button disabled={!canEdit}>Edit</button>

<Can /> Component
<access.Can
  permissions={auth.permissions}
  permission="USER:DELETE"
>
  <DeleteUserButton />
</access.Can>

🧠 Type Safety & Autocomplete

Invalid permission → ❌ TypeScript error

Invalid resource/action → ❌ TypeScript error

IDE auto-suggests valid permissions everywhere

// ❌ Invalid
"BLOGS:PUBLISH"

// ✅ Valid
"BLOGS:CREATE"

🏗️ API Reference
Metadata
access.roles
access.actions
access.resources
access.permissions
access.permissionKeys

Backend
access.allow(role, permission)
access.can(role, permission)
access.resolvePermissions(role)
access.normalizePermissions(raw)

Frontend
access.useCan(permissions, permission)
<access.Can />

🆚 Comparison with Keycloak

This package is an application-level authorization engine, not a full IAM system.

Area	@accessx/core	Keycloak
Identity	❌	✅
RBAC Core	✅	✅
Type Safety	✅	❌
Frontend Hooks	✅	❌
Performance	✅	❌
Admin UI	❌	✅
Multi-App SSO	❌	✅
Runtime Policy Change	❌	✅
Enterprise Compliance	❌	✅
Ops Overhead	Low	High
Strengths

Excellent developer experience (TypeScript-first)

Frontend hooks and React components

High performance and low latency

Embedded, framework-agnostic, zero ops

Weaknesses Compared to Keycloak

No identity or login management

No multi-application SSO

No admin UI or delegation

Permissions mostly static (redeploy needed for new resources/actions)

No ABAC / advanced policy language

No enterprise audit / compliance tooling

Ideal Usage
Keycloak (Authentication + Identity)
        ↓
JWT / Claims
        ↓
@accessx/core (Authorization + UI permissions)


This is complementary, not a replacement for Keycloak.

🏆 Why Use @accessx/core?

Zero manual permission creation

DB, backend & frontend always in sync

Enterprise-grade RBAC foundation for apps

Scales to ABAC, multi-role, multi-tenant systems

## 🧠 ABAC (Attribute-Based Access Control)

You can define dynamic permissions based on context (e.g., user ID, ownership checking).

### 1. Define with Conditions
```typescript
access.allow("USER", "BLOG:UPDATE", (context: { user: any; post: any }) => {
  return context.post.authorId === context.user.id;
});
```

### 2. Check with Context
The `can` method accepts an optional context object as the third argument.

```typescript
const canEdit = access.can("USER", "BLOG:UPDATE", { user, post });
```

### 3. Frontend Usage
React components also support `context`.

```tsx
<Can permissions={myPermissions} permission="BLOG:UPDATE" context={{ user, post }}>
  <button>Edit Post</button>
</Can>
```

## 🧪 Testing

The package includes a comprehensive test suite using Jest.

```bash
npm test
```

## 🛣️ Roadmap

Wildcard permissions (BLOGS:*)

Multi-role users

Attribute-based access control (ABAC)

Permission groups

JWT permission compression

CLI generator

📄 License

MIT

💡 Inspiration

Zanzibar (Google)

Auth0 / Keycloak permission models

CASL & OPA (simplified DX)

One definition. One truth. Everywhere. 🔐✨
