import { useRef } from "react";
import ToolbarButton from "./ToolbarButton";

/**
 * File-picker + import trigger. Parent owns upload logic via onImport(file).
 */
function ImportButton({
  label = "Import",
  accept = ".xlsx,.xls",
  loading = false,
  loadingLabel = "Importing…",
  disabled = false,
  onImport,
  onFileSelect,
  className = "",
}) {
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    onFileSelect?.(file);

    if (file && onImport) {
      onImport(file);
    }

    event.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <ToolbarButton
        type="button"
        variant="primary"
        loading={loading}
        loadingLabel={loadingLabel}
        disabled={disabled}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </ToolbarButton>
    </>
  );
}

export default ImportButton;
