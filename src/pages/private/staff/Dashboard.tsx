import { Link } from 'react-router-dom';
import { CalendarIcon, LayoutDashboardIcon, ReceiptIcon, TrendingUpIcon } from '@icons';
import { PageHeader } from '@/components/private/common/PageHeader';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/card';

const memberLinks = [
  { to: '/dashboard/appointments', label: 'Rendez-vous', icon: CalendarIcon     },
  { to: '/dashboard/billing',      label: 'Facturation', icon: ReceiptIcon      },
];

export default function StaffDashboard() {
  const { user } = useAuth();

  return (
    <div className="dash-page">
      <PageHeader
        badge={{ icon: LayoutDashboardIcon, label: 'Staff' }}
        icon={<TrendingUpIcon size={26} />}
        title={`Bienvenue, ${user?.first_name || user?.email}`}
        description="Espace Staff SonnaLab"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memberLinks.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="p-5 hover:bg-secondary transition-colors">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <Icon className="size-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
