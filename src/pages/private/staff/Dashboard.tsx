import { Link } from 'react-router-dom';
import { CalendarIcon, FolderKanbanIcon, ReceiptIcon } from '@icons';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/card';

const memberLinks = [
  { to: '/dashboard/appointments', label: 'Rendez-vous', icon: CalendarIcon     },
  { to: '/dashboard/projects',     label: 'Projets',     icon: FolderKanbanIcon },
  { to: '/dashboard/billing',      label: 'Facturation', icon: ReceiptIcon      },
];

export default function StaffDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
          Bienvenue, {user?.first_name || user?.email}
        </h1>
        <p className="mt-1 text-muted-foreground">Espace Staff SonnaLab</p>
      </header>

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
