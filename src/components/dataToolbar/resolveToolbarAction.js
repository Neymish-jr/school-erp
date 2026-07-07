/**
 * Resolve whether a toolbar action should render.
 * Modules may pass `visible`, a single `permission`, or `permissions` (any).
 */
export function resolveToolbarAction(action, can, canAny) {
  if (!action) {
    return false;
  }

  if (action.visible === false) {
    return false;
  }

  if (action.visible === true) {
    return true;
  }

  if (action.permission) {
    return can(action.permission);
  }

  if (action.permissions?.length) {
    return canAny(action.permissions);
  }

  return Boolean(action.onClick || action.onImport);
}

export default resolveToolbarAction;
