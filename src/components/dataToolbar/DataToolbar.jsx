import { usePermissions } from "../../hooks/usePermissions";
import ButtonGroup from "./ButtonGroup";
import ExportButton from "./ExportButton";
import ImportButton from "./ImportButton";
import TemplateButton from "./TemplateButton";
import ToolbarButton from "./ToolbarButton";
import { resolveToolbarAction } from "./resolveToolbarAction";

/**
 * Standard master-module toolbar: Add | Import | Export | Download Template.
 *
 * Each action is optional. Visibility is driven by `visible`, `permission`, or
 * `permissions` on the action config — no module-specific logic in this component.
 *
 * @example
 * <DataToolbar
 *   add={{ label: "+ Add Student", onClick: openModal, permission: "student.create" }}
 *   import={{ onImport: handleImport, permission: "student.import.execute" }}
 *   export={{ onClick: handleExport, permission: "student.export.execute" }}
 *   template={{ onClick: handleTemplate, permission: "student.import.template" }}
 * />
 */
function DataToolbar({ add, import: importAction, export: exportAction, template, className = "" }) {
  const { can, canAny } = usePermissions();

  const showAdd = resolveToolbarAction(add, can, canAny);
  const showImport = resolveToolbarAction(importAction, can, canAny);
  const showExport = resolveToolbarAction(exportAction, can, canAny);
  const showTemplate = resolveToolbarAction(template, can, canAny);

  if (!showAdd && !showImport && !showExport && !showTemplate) {
    return null;
  }

  return (
    <ButtonGroup className={className}>
      {showAdd ? (
        <ToolbarButton
          type="button"
          variant="primary"
          loading={add.loading}
          loadingLabel={add.loadingLabel}
          disabled={add.disabled}
          onClick={add.onClick}
        >
          {add.label ?? "+ Add"}
        </ToolbarButton>
      ) : null}

      {showImport ? (
        <ImportButton
          label={importAction.label ?? "Import"}
          accept={importAction.accept}
          loading={importAction.loading}
          loadingLabel={importAction.loadingLabel}
          disabled={importAction.disabled}
          onImport={importAction.onImport}
          onFileSelect={importAction.onFileSelect}
        />
      ) : null}

      {showExport ? (
        <ExportButton
          label={exportAction.label ?? "Export"}
          loading={exportAction.loading}
          loadingLabel={exportAction.loadingLabel}
          disabled={exportAction.disabled}
          onClick={exportAction.onClick}
        />
      ) : null}

      {showTemplate ? (
        <TemplateButton
          label={template.label ?? "Download Template"}
          loading={template.loading}
          loadingLabel={template.loadingLabel}
          disabled={template.disabled}
          onClick={template.onClick}
        />
      ) : null}
    </ButtonGroup>
  );
}

export default DataToolbar;
