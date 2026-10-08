import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import CurrencyModal from "./CurrencyModal";

export default function CurrencySelector() {
  const { baseCurrency, activeCurrencyInfo, currencies, changeBaseCurrency } = useCurrency();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
        style={{
          backgroundColor: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
        title="Currency Settings"
        aria-label={`Current base currency: ${baseCurrency}. Click to change.`}
      >
        <span style={{ color: "var(--accent)" }} className="font-bold">
          {activeCurrencyInfo.symbol}
        </span>
        <span className="tracking-wide font-mono text-[11px]">{baseCurrency}</span>
        <svg
          className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-muted)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-1.5 w-48 rounded-lg shadow-lg z-50 py-1 overflow-hidden animate-fade-in"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="px-3 py-1.5 text-[10px] uppercase font-semibold tracking-wider"
            style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
          >
            Base Currency
          </div>

          {currencies.map((curr) => {
            const isSelected = curr.code === baseCurrency;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => {
                  changeBaseCurrency(curr.code);
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer"
                style={{
                  backgroundColor: isSelected ? "var(--surface-2)" : "transparent",
                  color: isSelected ? "var(--accent)" : "var(--text)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="w-4 font-bold text-center" style={{ color: "var(--accent)" }}>
                    {curr.symbol}
                  </span>
                  <span>{curr.name}</span>
                </span>
                <span className="text-[10px] font-mono opacity-60">{curr.code}</span>
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid var(--border)" }} className="mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setModalOpen(true);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.backgroundColor = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Exchange Rates & Cache</span>
            </button>
          </div>
        </div>
      )}

      <CurrencyModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
