import { useAuth } from '../contexts/AuthContext';
import { ROLES_WITH_DELETE, ROLES_WITH_EDIT, ROLES_WITH_CATALOG_MANAGE } from '../config/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';
  return {
    canDelete: ROLES_WITH_DELETE.includes(role),
    canEdit: ROLES_WITH_EDIT.includes(role),
    canManageCatalog: ROLES_WITH_CATALOG_MANAGE.includes(role),
  };
};
