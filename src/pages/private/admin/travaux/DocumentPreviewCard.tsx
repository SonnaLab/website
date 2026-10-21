import { useTranslation } from 'react-i18next';
import { apiAssetUrl } from '@/services/api';
import { billedDays, calculateDevis, formatDays, hoursOf, workingDays, WORKDAY_HOURS } from '@/lib/devisCalc';
import { bankLine, footerAddress, footerSlogan, footerWebsite, vatNumber } from '@/lib/letterhead';
import type { TravauxClient, TravauxObjective, TravauxTask } from '@/types/travaux';
import { formatDate, formatEuros } from './format';

export interface DocumentPreviewData {
  kindLabel: string;
  /** Numéro imprimé (sans préfixe DEV-/FAC-, avec la version), ex. « 261016084436V2 ». */
  printedNumber: string;
  title: string;
  /** Montant enregistré, en euros — utilisé quand aucune répartition n'est calculable. */
  amount: number | null;
  dueDate: string | null;
  /** Issue date: the phases are computed from it. */
  issuedOn?: string | null;
  dailyRate: number | null;
  objective: TravauxObjective | null;
  /** Tâches du livrable : la répartition jours/prix est recalculée en direct. */
  tasks: TravauxTask[];
  issuer: TravauxClient | null;
  client: TravauxClient | null;
}

function PartyBlock({ party, label }: { party: TravauxClient | null; label: string }) {
  const logo = apiAssetUrl(party?.logo_path);
  const phone = party?.phone || party?.referent_phone;
  return (
    <div className="trv-doc__party">
      <p className="trv-doc__label">{label}</p>
      {logo ? (
        <img src={logo} alt={party?.name} className="trv-doc__logo" />
      ) : (
        <span className="trv-doc__avatar">{party?.initials ?? '?'}</span>
      )}
      <p className="trv-doc__name">{party?.name || '—'}</p>
      {/* SIRET, e-mail and phone are enough: no postal address. */}
      {party?.siret && <p className="trv-doc__meta">SIRET : {party.siret}</p>}
      {party?.contact_email && <p className="trv-doc__meta">{party.contact_email}</p>}
      {phone && <p className="trv-doc__meta">{phone}</p>}
    </div>
  );
}

/**
 * Réplique HTML du PDF serveur (app/services/travaux/devis_pdf.rb) : mêmes
 * blocs, même calcul — utilisée dans l'aperçu et en direct dans l'édition.
 */
export function DocumentPreviewCard({ data }: { data: DocumentPreviewData }) {
  const { t } = useTranslation('admin');
  const calc = data.objective ? calculateDevis(data.tasks, data.dueDate, data.dailyRate, data.issuedOn) : null;
  const hasAllocations = !!calc && calc.allocations.length > 0;
  const deliverableTitle = data.objective?.title || data.title || '—';
  const bank = bankLine(data.issuer);
  const address = footerAddress(data.issuer);
  const vat = vatNumber(data.issuer);

  return (
    <div className="trv-doc">
      <div className="trv-doc__parties">
        <PartyBlock party={data.issuer} label={t('travaux.document.emittedBy')} />
        <PartyBlock party={data.client} label={t('travaux.document.attentionOf')} />
      </div>
      <div className="trv-doc__number">
        <span className="trv-doc__rule" />
        <span>{data.kindLabel} N°{data.printedNumber || '—'}</span>
        <span className="trv-doc__rule" />
      </div>

      <div className="trv-doc__body">
        <div className="trv-doc__deliverable">
          <p className="trv-doc__label">{t('travaux.document.deliverable')}</p>
          <p className="trv-doc__deliverable-title">{deliverableTitle}</p>
          {data.objective?.description && <p className="trv-doc__deliverable-desc">{data.objective.description}</p>}
        </div>

        <table className="trv-doc__table">
          <thead>
            <tr>
              <th>{t('travaux.document.phases')}</th>
              <th>{t('travaux.document.description')}</th>
              {hasAllocations && <th className="trv-right">{t('travaux.document.workingDays')}</th>}
              <th className="trv-right">{t('travaux.document.price')}</th>
            </tr>
          </thead>
          <tbody>
            {hasAllocations ? (
              calc!.allocations.map(({ task, days, price, offered }, index) => (
                <tr key={task.id}>
                  <td className="trv-doc__muted">{index + 1}</td>
                  <td>
                    <p className="trv-doc__task-title">{task.title}</p>
                    {task.description && <p className="trv-doc__task-desc">{task.description}</p>}
                  </td>
                  <td className="trv-right trv-doc__muted">{offered ? '—' : formatDays(workingDays(days))}</td>
                  <td className="trv-right trv-num">{offered ? t('travaux.document.offered') : formatEuros(price)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="trv-doc__muted">1</td>
                <td>{deliverableTitle}</td>
                <td className="trv-right trv-num">{formatEuros(data.amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={hasAllocations ? 3 : 2} className="trv-right" style={{ fontWeight: 600 }}>
                {t('travaux.document.total')}
              </td>
              <td className="trv-right">
                <mark className="trv-doc__mark">{formatEuros(hasAllocations ? calc!.totalPrice : data.amount)}</mark>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="trv-doc__mentions">
          {hasAllocations && (
            <p>{t('travaux.document.workingDaysMention', { hours: WORKDAY_HOURS, total: hoursOf(billedDays(calc!)) })}</p>
          )}
          <p>{bank ? t('travaux.document.paymentMentionBank', { bank }) : t('travaux.document.paymentMention')}</p>
          <p>
            {t('travaux.document.depositMentionBefore')}{' '}
            <mark className="trv-doc__mark">{t('travaux.document.depositMentionRate')}</mark>{' '}
            {t('travaux.document.depositMentionAfter')}
          </p>
        </div>
      </div>

      <div className="trv-doc__footer">
        <p className="trv-doc__schedule">
          {t('travaux.document.schedule')} : <mark className="trv-doc__mark">{formatDate(data.dueDate)}</mark>
        </p>
        <div>
          <p className="trv-doc__vat">
            {vat ? t('travaux.document.vatNumber', { number: vat }) : t('travaux.document.vatMention')}
          </p>
          <div className="trv-doc__footer-lines">
            <p>{footerWebsite(data.issuer)}</p>
            {address && <p>{address}</p>}
            <p>{footerSlogan(data.issuer)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
