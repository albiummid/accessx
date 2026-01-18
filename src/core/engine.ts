import { ConditionFn, Resource } from "../types";

export type PermissionKey<
    Res extends readonly Resource[],
    A extends readonly string[],
> = `${Res[number]["key"]}:${A[number]}` | `${Res[number]["key"]}:*` | "*";

export function createEngine<
    const R extends readonly string[],
    const A extends readonly string[],
    const Res extends readonly Resource[],
>(config: { roles: R; actions: A; resources: Res }) {
    type Role = R[number];
    type Action = A[number];
    type ResourceKey = Res[number]["key"];
    type Permission = PermissionKey<Res, A>;

    type Assignment = {
        permissions: Map<Permission, ConditionFn>;
        permsFetcher?: () => Promise<Permission | Permission[]>;
        invalidateKeyFetcher?: string | (() => Promise<string>);
        lastInvalidateKey?: string;
        interval?: number;
        timer?: any;
        condition?: ConditionFn;
    };

    type AssignOptions = {
        condition?: ConditionFn;
        invalidateKey?: string | (() => Promise<string>);
        interval?: number;
    };

    const roleAssignments = new Map<Role, Assignment[]>();
    const listeners = new Set<() => void>();

    function subscribe(cb: () => void) {
        listeners.add(cb);
        return () => {
            listeners.delete(cb);
        };
    }

    function notify() {
        listeners.forEach((cb) => cb());
    }

    const permissions = config.resources.flatMap((resource) =>
        config.actions.map((action) => ({
            key: `${resource.key}:${action}` as Permission,
            resource,
            action,
        })),
    );

    const permissionKeys = permissions.map((p) => p.key);

    async function assignPermissions(
        role: Role,
        perms:
            | Permission
            | Permission[]
            | (() => Promise<Permission | Permission[]>),
        options?: ConditionFn | AssignOptions,
    ) {
        const condition =
            typeof options === "function" ? options : options?.condition;
        const invalidateKey =
            typeof options === "object" ? options?.invalidateKey : undefined;
        const interval =
            typeof options === "object" ? options?.interval : undefined;

        const assignment: Assignment = {
            permissions: new Map(),
            permsFetcher: typeof perms === "function" ? perms : undefined,
            invalidateKeyFetcher: invalidateKey,
            interval: interval,
            condition: condition,
        };

        const updatePermissions = (list: Permission[]) => {
            assignment.permissions.clear();
            list.forEach((p) =>
                assignment.permissions.set(
                    p,
                    assignment.condition || (() => true),
                ),
            );
            notify();
        };

        const updateFn = async (newKey?: string) => {
            let list: Permission[] = [];
            if (typeof perms === "function") {
                const _permissions = await perms();
                list = Array.isArray(_permissions)
                    ? _permissions
                    : [_permissions];
            } else {
                list = Array.isArray(perms) ? perms : [perms];
            }

            updatePermissions(list);

            if (newKey !== undefined) {
                assignment.lastInvalidateKey = newKey;
            } else if (assignment.invalidateKeyFetcher) {
                assignment.lastInvalidateKey =
                    typeof assignment.invalidateKeyFetcher === "function"
                        ? await assignment.invalidateKeyFetcher()
                        : assignment.invalidateKeyFetcher;
            }
        };

        // Immediate application for synchronous perms
        if (typeof perms !== "function") {
            const list = Array.isArray(perms) ? perms : [perms];
            updatePermissions(list);

            // Handle literal key synchronously
            if (invalidateKey && typeof invalidateKey !== "function") {
                assignment.lastInvalidateKey = invalidateKey;
            }
        }

        if (!roleAssignments.has(role)) roleAssignments.set(role, []);
        roleAssignments.get(role)!.push(assignment);

        // Still call updateFn to handle potential async invalidateKeyFetcher
        // and initial perms fetch if it's a function.
        const initialUpdate = updateFn();
        if (
            typeof perms === "function" ||
            typeof invalidateKey === "function"
        ) {
            await initialUpdate;
        }

        if (interval && interval > 0) {
            assignment.timer = setInterval(async () => {
                const currentKey = assignment.invalidateKeyFetcher
                    ? typeof assignment.invalidateKeyFetcher === "function"
                        ? await assignment.invalidateKeyFetcher()
                        : assignment.invalidateKeyFetcher
                    : undefined;

                if (
                    !assignment.invalidateKeyFetcher ||
                    currentKey !== assignment.lastInvalidateKey
                ) {
                    await updateFn(currentKey);
                }
            }, interval);
        }
    }

    async function refresh(role?: Role) {
        const roles = role ? [role] : Array.from(roleAssignments.keys());

        for (const r of roles) {
            const assignments = roleAssignments.get(r) || [];
            for (const a of assignments) {
                if (!a.permsFetcher) continue;

                const localUpdate = async (newKey?: string) => {
                    const _permissions = await a.permsFetcher!();
                    const list = Array.isArray(_permissions)
                        ? _permissions
                        : [_permissions];
                    a.permissions.clear();
                    list.forEach((p) =>
                        a.permissions.set(p, a.condition || (() => true)),
                    );

                    if (newKey !== undefined) {
                        a.lastInvalidateKey = newKey;
                    } else if (a.invalidateKeyFetcher) {
                        a.lastInvalidateKey =
                            typeof a.invalidateKeyFetcher === "function"
                                ? await a.invalidateKeyFetcher()
                                : a.invalidateKeyFetcher;
                    }
                    notify();
                };

                if (a.invalidateKeyFetcher) {
                    const currentKey =
                        typeof a.invalidateKeyFetcher === "function"
                            ? await a.invalidateKeyFetcher()
                            : a.invalidateKeyFetcher;

                    if (currentKey !== a.lastInvalidateKey) {
                        await localUpdate(currentKey);
                    }
                } else {
                    await localUpdate();
                }
            }
        }
    }

    function getRolePermissions(role: Role): Permission[] {
        const assignments = roleAssignments.get(role) || [];
        const allPerms = new Set<Permission>();
        assignments.forEach((a) => {
            Array.from(a.permissions.keys()).forEach((p) => allPerms.add(p));
        });
        return Array.from(allPerms);
    }

    function allow(
        role: Role,
        permission: Permission | Permission[],
        condition?: ConditionFn,
    ) {
        assignPermissions(role, permission, condition);
    }

    function resolvePermissions(role: Role): Permission[] {
        return getRolePermissions(role);
    }

    function can(
        role: Role | Role[],
        permission: Permission,
        context?: any,
    ): boolean {
        const roles = Array.isArray(role) ? role : [role];

        return roles.some((r) => {
            const assignments = roleAssignments.get(r);
            if (!assignments) return false;

            return assignments.some((assignment) => {
                const permsMap = assignment.permissions;

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
            });
        });
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
        can,
        resolvePermissions,
        normalizePermissions,
        getRolePermissions,
        assignPermissions,
        refresh,
        subscribe,
    };
}

export type Engine = ReturnType<typeof createEngine>;
