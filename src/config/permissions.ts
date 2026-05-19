// Roles that can delete records. Add a role here to grant it delete access.
export const ROLES_WITH_DELETE: string[] = ['ADMIN', 'SUPER_ADMIN'];

// Roles that can edit records. Add a role here to grant it edit access.
export const ROLES_WITH_EDIT: string[] = ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'PRODUCTION'];

// Roles that can add/update products and pricing. Add a role here to grant catalog management.
export const ROLES_WITH_CATALOG_MANAGE: string[] = ['ADMIN', 'SUPER_ADMIN'];
