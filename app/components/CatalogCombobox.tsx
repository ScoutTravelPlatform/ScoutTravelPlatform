"use client";

import { useEffect, useRef, useState } from "react";

export type CatalogOption = { id: string; name: string };

type Props = {
  label: string;
  value: string;
  onTextChange: (text: string) => void;
  onSelect: (option: CatalogOption) => void;
  search: (query: string) => Promise<{ error: string | null; options: CatalogOption[] }>;
  create: (name: string) => Promise<{ error: string | null; option: CatalogOption | null }>;
  disabled?: boolean;
  placeholder?: string;
  inputClassName?: string;
  labelClassName?: string;
};

const defaultInputClassName = "w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50";
const defaultLabelClassName = "mb-2 block font-medium";

export default function CatalogCombobox({ label, value, onTextChange, onSelect, search, create, disabled, placeholder, inputClassName, labelClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [creating, setCreating] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // search/create are typically inline arrow functions from the caller, so
  // they get a new identity on every render. Reading them via ref (instead
  // of putting `search` in the effect's dependency array) means a parent
  // re-render can't cancel and reschedule the debounce timer below — only
  // an actual value/disabled/open change does.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });

  // Searches as soon as the field opens (focus), even with an empty query —
  // this is what makes it behave like a real dropdown you can click and
  // browse, not one that only shows anything after you start typing.
  useEffect(() => {
    if (disabled || !open) return;
    const timeout = setTimeout(async () => {
      const result = await searchRef.current(value);
      setOptions(result.options);
    }, 200);
    return () => clearTimeout(timeout);
  }, [value, disabled, open]);

  const visibleOptions = disabled ? [] : options;

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setOpen(true);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  function pick(option: CatalogOption) {
    onSelect(option);
    setOpen(false);
  }

  async function addNew() {
    setCreating(true);
    const result = await create(value);
    setCreating(false);
    if (result.option) pick(result.option);
  }

  const trimmed = value.trim();
  const exactMatch = visibleOptions.some((option) => option.name.toLowerCase() === trimmed.toLowerCase());
  const showAdd = open && trimmed.length > 0 && !exactMatch && !creating;

  return (
    <div className="relative">
      <label className={labelClassName ?? defaultLabelClassName}>{label}</label>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onTextChange(event.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={inputClassName ?? defaultInputClassName}
      />
      {open && !disabled && (visibleOptions.length > 0 || showAdd) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {visibleOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-sky-50"
            >
              {option.name}
            </button>
          ))}
          {showAdd && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addNew}
              disabled={creating}
              className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
            >
              {creating ? "Adding…" : `+ Add "${trimmed}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
