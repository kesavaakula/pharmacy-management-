const securityItems = [
  'JWT-based authentication for protected pharmacy workflows',
  'BCrypt password hashing and role-based authorization',
  'Input validation and secure API endpoints',
  'Audit-friendly transaction records for sales and purchases',
  'Encrypted-ready environment-based configuration',
];

export default function SecurityPage() {
  return (
    <div className="card p-5">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Security</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">Secure pharmacy operations</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {securityItems.map((item) => (
          <div key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
