import { FileCheck2, Fingerprint, LockKeyhole, Shield } from 'lucide-react';
import { PageHeader } from '../components/ui';

const securityItems = [
  {
    title: 'JWT authentication',
    description: 'Every API call except login and the health check requires a signed token.',
    icon: LockKeyhole,
  },
  {
    title: 'Role-based access',
    description: 'Accounts carry a role (admin / staff) so operational controls can be separated.',
    icon: Shield,
  },
  {
    title: 'Input validation',
    description: 'The API rejects negative stock, expired or out-of-stock sales and invalid orders with clear messages.',
    icon: Fingerprint,
  },
  {
    title: 'Transaction safety',
    description: 'Sales, cancellations and deliveries run as single transactions, so stock never ends up half-updated.',
    icon: FileCheck2,
  },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="How PharmaFlow protects pharmacy data and keeps stock accurate." />
      <div className="grid gap-4 md:grid-cols-2">
        {securityItems.map(({ title, description, icon: Icon }) => (
          <div key={title} className="card flex gap-4 p-5">
            <div className="h-fit rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
