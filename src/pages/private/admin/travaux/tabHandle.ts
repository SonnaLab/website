/** Chaque onglet expose « Nouveau… » au bouton d'en-tête de la page client. */
export interface TravauxTabHandle {
  openNew(): void;
  /** Livrables only: « Nouveau projet », just before « Nouveau livrable ». */
  openNewProject?(): void;
}
