export function Spinner({ label = 'Loading' }) { return <div className="loading" role="status"><span className="spinner" />{label}</div>; }
export function ErrorBox({ children, retry }) { return <div className="alert error" role="alert"><span>{children}</span>{retry ? <button className="text-button" onClick={retry}>Try again</button> : null}</div>; }
export function Toggle({ checked, onChange, label }) { return <label className="toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span aria-hidden="true" /><b>{label}</b></label>; }
export function Money({ value }) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
