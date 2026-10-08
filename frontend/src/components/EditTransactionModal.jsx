import TransactionForm from "./TransactionForm";

export default function EditTransactionModal({ transaction, onClose, onSaved }) {
  if (!transaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
      style={{ backgroundColor: "rgba(11, 11, 12, 0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg p-6 relative animate-slide-up"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="btn-icon absolute top-4 right-4"
          aria-label="Close modal"
        >
          ✕
        </button>
        <TransactionForm
          transaction={transaction}
          onSuccess={() => {
            if (onSaved) onSaved();
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

