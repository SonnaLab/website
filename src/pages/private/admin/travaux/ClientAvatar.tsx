import { apiAssetUrl } from '@/services/api';
import type { TravauxClient } from '@/types/travaux';

/** Logo du client, ou ses initiales dans une pastille noire (même règle que le PDF). */
export function ClientAvatar({ client, size = 'md' }: { client: Pick<TravauxClient, 'name' | 'initials' | 'logo_path'>; size?: 'md' | 'lg' }) {
  const logo = apiAssetUrl(client.logo_path);
  if (logo) {
    return <img src={logo} alt={client.name} className={size === 'lg' ? 'trv-logo trv-logo--lg' : 'trv-logo'} />;
  }
  return <span className={size === 'lg' ? 'trv-avatar trv-avatar--lg' : 'trv-avatar'}>{client.initials}</span>;
}
