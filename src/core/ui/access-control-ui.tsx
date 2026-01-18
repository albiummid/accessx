import * as React from "react";

export interface CanProps {
    permission: string;
    context?: any;
    children: React.ReactNode;
}

export function createAccessUI(engine?: {
    can: (role: any, permission: any, context?: any) => boolean;
}) {
    /**
     * Hook to check permission.
     * If engine is provided, it uses the engine (pre-bound).
     * Otherwise, it requires granted permissions as first argument (legacy).
     */
    function useCan(
        grantedOrPermission: any[] | string,
        permissionOrContext?: string | any,
        maybeContext?: any
    ) {
        return React.useMemo(() => {
            if (engine) {
                // Pre-bound: useCan(permission, context)
                // We don't have the role here, so we assume the engine instance
                // is already bound to a role or we need to handle it differently.
                // Actually, createAccess will wrap this.
                return (engine as any).can(
                    grantedOrPermission,
                    permissionOrContext
                );
            }
            // Legacy: useCan(granted, permission, context)
            return canDo(
                grantedOrPermission as any[],
                permissionOrContext as string,
                maybeContext
            );
        }, [grantedOrPermission, permissionOrContext, maybeContext]);
    }

    function Can({
        permissions,
        permission,
        context,
        children,
    }: {
        permissions?: any[];
        permission: string;
        context?: any;
        children: React.ReactNode;
    }) {
        const allowed = engine
            ? (engine as any).can(permission, context)
            : canDo(permissions || [], permission, context); // Fallback for legacy

        return allowed ? <>{children}</> : null;
    }

    function canDo(granted: any[], permission: string, context?: any): boolean {
        if (granted.includes("*")) return true;
        if (granted.includes(permission)) return true;

        const [resource] = permission.split(":");
        if (granted.includes(`${resource}:*`)) return true;

        return false;
    }

    return { useCan, Can, canDo };
}
