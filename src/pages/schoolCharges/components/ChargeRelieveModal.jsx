import { useState } from "react";
import { relieveChargeAssignment } from "../../../api/charges";
import { Button, ErpModal } from "../../../design-system";

function ChargeRelieveModal({ isOpen, onClose, charge, currentHolder, onSuccess }) {
  const [isRelieving, setIsRelieving] = useState(false);
  const [error, setError] = useState("");

  const handleRelieve = async () => {
    if (!currentHolder?.id) {
      setError("No active assignment found to relieve.");
      return;
    }

    setIsRelieving(true);
    setError("");

    try {
      await relieveChargeAssignment(currentHolder.id);
      onSuccess?.();
      onClose();
    } catch (relieveError) {
      setError(
        relieveError?.response?.data?.message ||
          relieveError?.response?.data?.error ||
          "Unable to relieve assignment."
      );
    } finally {
      setIsRelieving(false);
    }
  };

  return (
    <ErpModal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Relieve Holder"
      title="Relieve from charge?"
      size="md"
    >
      <p className="text-sm text-slate-300">
        Relieve{" "}
        <span className="font-semibold text-white">{currentHolder?.teacher_name}</span> from{" "}
        <span className="font-semibold text-white">{charge?.charge_name}</span>? This will move the
        assignment to history.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
        <Button variant="secondary" type="button" onClick={onClose} disabled={isRelieving}>
          Cancel
        </Button>
        <Button variant="danger" type="button" onClick={handleRelieve} disabled={isRelieving}>
          {isRelieving ? "Relieving..." : "Relieve Holder"}
        </Button>
      </div>
    </ErpModal>
  );
}

export default ChargeRelieveModal;
