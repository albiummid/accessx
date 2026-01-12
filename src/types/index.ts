// Roles, Actions, Resources are generic
export type RoleType = string;
export type ActionType = string;
export type ResourceKeyType = string;

// Permission can be: exact action, resource wildcard, or global wildcard
export type PermissionType =
    | `${ResourceKeyType}:${ActionType}` // Specific action
    | `${ResourceKeyType}:*` // All actions of a resource
    | "*"; // Global all permissions

// Condition function for ABAC
export type ConditionFn<TContext = any> = (context: TContext) => boolean;

// Resource metadata
export interface Resource {
    name: string;
    key: ResourceKeyType;
    description?: string;
}
