import * as React from "react";
import { Resource } from "../types";
import { createEngine } from "./engine";
import { createAccessUI } from "./ui/access-control-ui";

export function createAccess<
    const R extends readonly string[],
    const A extends readonly string[],
    const Res extends readonly Resource[],
>(config: { roles: R; actions: A; resources: Res }) {
    const engine = createEngine(config);
    const { canDo } = createAccessUI();

    /**
     * Hook to manage permissions from various sources (static, dynamic, or engine-bound)
     */
    function usePermissions(
        source: R[number] | string[] | (() => Promise<string[]>),
    ) {
        const [perms, setPerms] = React.useState<string[]>([]);
        const [loading, setLoading] = React.useState(true);

        const fetch = React.useCallback(async () => {
            setLoading(true);
            try {
                if (typeof source === "function") {
                    const res = await source();
                    setPerms(res);
                } else if (Array.isArray(source)) {
                    setPerms(source);
                } else {
                    // Engine-bound role
                    setPerms(engine.getRolePermissions(source as any) as any);
                }
            } finally {
                setLoading(false);
            }
        }, [source]);

        React.useEffect(() => {
            fetch();
            // If it's a role (string provided but not an array), subscribe to global refreshes
            if (typeof source === "string" && !Array.isArray(source)) {
                return engine.subscribe(() => {
                    setPerms(engine.getRolePermissions(source as any) as any);
                });
            }
        }, [fetch, source]);

        return { permissions: perms, loading, refresh: fetch };
    }

    /**
     * Pre-bound UI components
     */
    function useCan(
        role: R[number] | R[number][],
        permission: string,
        context?: any,
    ) {
        const [allowed, setAllowed] = React.useState(() =>
            engine.can(role, permission as any, context),
        );

        React.useEffect(() => {
            setAllowed(engine.can(role, permission as any, context));
            return engine.subscribe(() => {
                setAllowed(engine.can(role, permission as any, context));
            });
        }, [role, permission, context]);

        return allowed;
    }

    function Can({
        role,
        permission,
        context,
        children,
    }: {
        role: R[number] | R[number][];
        permission: string;
        context?: any;
        children: React.ReactNode;
    }) {
        const allowed = useCan(role, permission, context);
        return allowed ? <>{children}</> : null;
    }

    return {
        ...engine,
        useCan,
        Can,
        usePermissions,
        refresh: engine.refresh,
        // Keep legacy check just in case
        canDo,
    };
}
