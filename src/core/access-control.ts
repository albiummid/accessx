import { ConditionFn, Resource } from "../types";

export function createAccess<
    const R extends readonly string[],
    const A extends readonly string[],
    const Res extends readonly Resource[]
>(config: { roles: R; actions: A; resources: Res }) {
    type Role = R[number];
    type Action = A[number];
    type ResourceKey = Res[number]["key"];
    type Permission = `${ResourceKey}:${Action}` | `${ResourceKey}:*` | "*";

    const permissions = config.resources.flatMap((resource) =>
        config.actions.map((action) => ({
            key: `${resource.key}:${action}` as Permission,
            resource,
            action,
        }))
    );

    const permissionKeys = permissions.map((p) => p.key);

    // Store perms with optional conditions
    const rolePermissions = new Map<Role, Map<Permission, ConditionFn>>();

    function assignPermissions(
        role: Role,
        perms: Permission | Permission[],
        condition?: ConditionFn
    ) {
        const list = Array.isArray(perms) ? perms : [perms];
        if (!rolePermissions.has(role)) rolePermissions.set(role, new Map());
        const permsMap = rolePermissions.get(role)!;
        list.forEach((p) => permsMap.set(p, condition || (() => true)));
    }

    function getRolePermissions(role: Role): Permission[] {
        const permsMap = rolePermissions.get(role);
        return permsMap ? Array.from(permsMap.keys()) : [];
    }

    function allow(
        role: Role,
        permission: Permission | Permission[],
        condition?: ConditionFn
    ) {
        assignPermissions(role, permission, condition);
    }

    function resolvePermissions(role: Role): Permission[] {
        return getRolePermissions(role);
    }

    function hasPermission(
        granted: Permission[],
        required: Permission,
        context?: any
    ): boolean {
        // This is a static check for local lists.
        // For ABAC, we need the actual definition with conditions.
        // If 'granted' is just string[], we can't check conditions unless we have the role definition.

        if (granted.includes("*")) return true;
        if (granted.includes(required)) return true;

        const [resource] = required.split(":");
        if (granted.includes(`${resource}:*` as Permission)) return true;

        return false;
    }

    // New: Role-aware permission check (supports ABAC)
    function can(role: Role, permission: Permission, context?: any): boolean {
        const permsMap = rolePermissions.get(role);
        if (!permsMap) return false;

        // 1. Global wildcard
        if (permsMap.has("*")) {
            const condition = permsMap.get("*")!;
            if (condition(context)) return true;
        }

        // 2. Direct match
        if (permsMap.has(permission)) {
            const condition = permsMap.get(permission)!;
            if (condition(context)) return true;
        }

        // 3. Resource wildcard
        const [resource] = permission.split(":");
        const resourceWildcard = `${resource}:*` as Permission;
        if (permsMap.has(resourceWildcard)) {
            const condition = permsMap.get(resourceWildcard)!;
            if (condition(context)) return true;
        }

        return false;
    }

    function normalizePermissions(raw: string[]): Permission[] {
        const valid = new Set(permissionKeys);
        return raw.filter((p): p is Permission => valid.has(p as Permission));
    }

    return {
        roles: config.roles,
        actions: config.actions,
        resources: config.resources,
        permissions,
        permissionKeys,
        allow,
        can, // Role-based check (ABAC supported)
        hasPermission, // Static list check (Legacy/Simple)
        resolvePermissions,
        normalizePermissions,
        assignPermissions,
        getRolePermissions,
    };
}
