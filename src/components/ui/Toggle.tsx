"use client";
interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; }
export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div className={`toggle-track${checked?" on":""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <div className="toggle-thumb" />
    </div>
  );
}
