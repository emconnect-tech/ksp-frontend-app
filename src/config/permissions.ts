// Roles that can delete records.
export const ROLES_WITH_DELETE: string[] = ['ADMIN', 'SUPER_ADMIN'];

// Roles that can edit records.
export const ROLES_WITH_EDIT: string[] = ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'PRODUCTION'];

// Roles that can add/update products and pricing.
export const ROLES_WITH_CATALOG_MANAGE: string[] = ['ADMIN', 'SUPER_ADMIN'];

// Roles that can manage users and access control.
export const ROLES_WITH_USER_MANAGE: string[] = ['ADMIN', 'SUPER_ADMIN'];
