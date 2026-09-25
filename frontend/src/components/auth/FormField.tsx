import type { InputHTMLAttributes, ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
}

function FormField({ label, icon, ...inputProps }: FormFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        <input {...inputProps} />
        {icon}
      </span>
    </label>
  );
}

export default FormField;
