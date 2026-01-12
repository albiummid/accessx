import * as React from "react";
import { PermissionType } from "../../types";

export function createAccessUI() {
    function useCan(
        granted: PermissionType[],
        permission: PermissionType,
        context?: any
    ) {
        return React.useMemo(
            () => canDo(granted, permission, context),
            [granted, permission, context]
        );
    }

    function Can({
        permissions,
        permission,
        context,
        children,
    }: {
        permissions: PermissionType[];
        permission: PermissionType;
        context?: any;
        children: React.ReactNode;
    }) {
        return canDo(permissions, permission, context) ? children : null;
    }

    // ✅ Function-level permission checker
    // Note: This is a static list check. If conditions are needed on frontend,
    // the frontend list should contain the logic or be checked against a role-aware engine.
    function canDo(
        granted: PermissionType[],
        permission: PermissionType,
        context?: any
    ): boolean {
        if (granted.includes("*")) return true;
        if (granted.includes(permission)) return true;

        const [resource] = permission.split(":");
        if (granted.includes(`${resource}:*` as PermissionType)) return true;

        return false;
    }

    return { useCan, Can, canDo };
}
