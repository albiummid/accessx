# @lbstack/accessx

[📄 llm.txt (AI Friendly)](./llm.txt)

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

res.json({
  user,
  permissions: access.resolvePermissions(user.role),
});
```

## 🔑 Assigning Permissions

There are two ways to assign permissions to roles: **Manual (Static)** and **Dynamic (Database-linked)**.

### 1. Manual Assignment (Static)
Best for hardcoded defaults or simple applications. This is the standard, **non-mandatory** approach.

```typescript
// Single permission
access.allow("ADMIN", "USER:DELETE");

// Multiple permissions
access.allow("EDITOR", ["BLOGS:CREATE", "BLOGS:READ", "BLOGS:UPDATE"]);

// With custom ABAC conditions (DEPRECATED: Use Runtime Validation instead)
access.allow("USER", "BLOG:UPDATE", (context) => {
  return context.post.authorId === context.user.id;
});
```

### 2. Dynamic Assignment (Database + Cache)
Best for production apps where permissions are managed in a DB or Admin Panel. This is **optional** but provides powerful caching and auto-sync benefits.

```typescript
await access.assignPermissions("ADMIN", 
  // 1. Fetcher: Returns the list of valid permissions from your DB
  async () => {
    const permissions = await db.query("SELECT key FROM permissions WHERE role = 'ADMIN'");
    return permissions.map(p => p.key);
  }, 
  {
    // OPTIONAL: A fast key-check (e.g., Redis version or DB timestamp)
    // The engine only re-runs the Fetcher if this key changes.
    invalidateKey: async () => await redis.get("perms:admin:version"),
    
    // OPTIONAL: Auto-check for updates every 60 seconds in the background
    interval: 60000 
  }
);
```

> [!TIP]
> **Extra Benefits**: By using `invalidateKey`, you avoid hitting your database for every permission check. The engine keeps permissions in an in-memory cache and only refetches when your "version" key in Redis/DB changes.

## 🔄 Manual Refresh & Sync

If you don't use the `interval` option, or if you need to force a sync after an admin update, use the `refresh` method.

```typescript
// Forces the engine to check invalidateKeys and re-fetch if they changed
await access.refresh();

// Refresh only a specific role
await access.refresh("ADMIN");
```

## 🎨 Frontend Usage (React)

Frontend components are reactive. When you call `access.refresh()` or when an `interval` triggers an update, all components using the hooks will automatically re-render.

### 1. `useCan` Hook (Engine Bound)
Automatically re-renders when the engine's permissions for the given role change.

```tsx
const canEdit = access.useCan("EDITOR", "BLOGS:UPDATE");
```

### 2. `usePermissions` Hook (Flexible Source)
Manage permissions from any source (Static, Async, or Role). Provides `loading` state and a manual `refresh` trigger.

```tsx
const { permissions, loading, refresh } = access.usePermissions(async () => {
  const res = await api.get("/my-permissions");
  return res.data;
});

if (loading) return <Spinner />;

return (
  <div>
    <button onClick={() => refresh()}>Sync Permissions</button>
    <Can permissions={permissions} permission="BLOG:CREATE">
      <CreatePost />
    </Can>
  </div>
);
```

### 3. `<Can />` Component
Works with both roles (engine-bound) and explicit permission arrays.

```tsx
// Role-based (Reactive)
<access.Can role="ADMIN" permission="USER:DELETE">
  <DeleteButton />
</access.Can>

// Permission-based
<access.Can permissions={userPerms} permission="BLOGS:READ">
  <PostList />
</access.Can>
```

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
access.assignPermissions(role, perms, options) // Async: Supports fetchers & invalidation
access.can(role, permission)
access.resolvePermissions(role)
access.normalizePermissions(raw)
access.refresh(role?) // Async: Trigger key check and conditional refetch

Frontend
access.useCan(permissions, permission)
<access.Can />

🔐 Multi-Permission Assignment
Assign multiple permissions to a role at once:
```typescript
access.allow("EDITOR", ["BLOGS:CREATE", "BLOGS:READ", "BLOGS:UPDATE"]);
```



🏆 Why Use @accessx/core?

Zero manual permission creation

DB, backend & frontend always in sync

Enterprise-grade RBAC foundation for apps

Scales to ABAC, multi-role, multi-tenant systems

## 🧠 ABAC (Attribute-Based Access Control)

You can define dynamic permissions based on context.

### 1. Runtime Validation (Recommended) ✨

Pass a validator function directly to `access.can`. This function is executed at runtime.

```typescript
const isAllowed = access.can(user.role, "BLOG:UPDATE", () => {
    // Your logic here
    return post.authorId === user.id;
});
```

This approach allows you to keep your permissions stored as pure data (strings) in your database while keeping the complex validation logic in your application code. Use `user.role` dynamically from your session/token.

### 2. Stored Conditions (Deprecated ⚠️)

> [!WARNING]
> Defining conditions during assignment is deprecated and may be removed in future versions. Please use Runtime Validation instead.

Defining conditions during assignment:

```typescript
// DEPRECATED
access.allow("USER", "BLOG:UPDATE", (context) => {
  return context.post.authorId === context.user.id;
});
```

Checking with context object:

```typescript
// DEPRECATED
const canEdit = access.can("USER", "BLOG:UPDATE", { user, post });
```

### 3. Frontend Usage

React components support the new pattern via the `validator` prop (requires update to React components, currently supports context object):

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

- [ ] Multi-role users
- [ ] Permission groups
- [ ] JWT permission compression
- [ ] CLI generator

📄 License

MIT

💡 Inspiration

Zanzibar (Google)

Auth0 / Keycloak permission models

CASL & OPA (simplified DX)

One definition. One truth. Everywhere. 🔐✨
