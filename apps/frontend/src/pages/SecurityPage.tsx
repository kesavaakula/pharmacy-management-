import { ShieldCheck, LockKeyhole, Fingerprint, FileCheck2, Shield } from 'lucide-react';

const securityItems = [
  {
    title: 'JWT authentication',
    description: 'Protected endpoints for sales, inventory, and supplier workflows.',
    icon: LockKeyhole,
  },
  {
    title: 'Role-based access',
    description: 'Clear separation between admin and operational pharmacy controls.',
    icon: Shield,
  },
  {
    title: 'Input validation',
    description: 'API safeguards for stock levels, customer data, and purchase actions.',
    icon: Fingerprint,
  },
  {
    title: 'Transaction auditability',
    description: 'Traceable purchase and billing activity for compliance and review.',
    icon: FileCheck2,
  },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-[0_20px_45px_rgba(16,185,129,0.24)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-100">Security</p>
            <h2 className="mt-1 text-2xl font-bold">Secure pharmacy operations</h2>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {securityItems.map(({ title, description, icon: Icon }) => (
          <div key={title} className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            </div>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
