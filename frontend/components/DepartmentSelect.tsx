"use client";

import { FRENCH_DEPARTMENTS } from "@/lib/departments";

type DepartmentSelectProps = {
  value: string;
  onChange: (code: string, label: string) => void;
  className?: string;
  required?: boolean;
};

export default function DepartmentSelect({
  value,
  onChange,
  className = "",
  required = false,
}: DepartmentSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => {
        const code = event.target.value;
        const department = FRENCH_DEPARTMENTS.find((item) => item.code === code);
        onChange(code, department?.label ?? "");
      }}
      required={required}
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm ${className}`}
    >
      <option value="">Département</option>
      {FRENCH_DEPARTMENTS.map((department) => (
        <option key={department.code} value={department.code}>
          {department.code} — {department.label}
        </option>
      ))}
    </select>
  );
}
