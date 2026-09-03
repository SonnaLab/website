// Contrat d'hydratation partage entre le rendu serveur (entry-server.tsx,
// invoque par scripts/prerender-blog.mjs au moment du build) et le premier
// rendu client (hydrateRoot dans main.tsx).
//
// Un seul <script id="__SSR_DATA__" type="application/json"> par page
// statique genere contient { route, data }. Les composants doivent lire
// cette valeur comme etat initial (lazy useState) -- PAS dans un useEffect --
// sinon le tout premier rendu client (loading=true, contenu vide) ne
// correspond plus a ce que le serveur a rendu (contenu reel), et React
// jette le sous-arbre hydrate pour le reconstruire au lieu de l'hydrater :
// exactement le flash qu'on cherche a eliminer, juste deplace d'un cran.
//
// Cote serveur (Node, pas de DOM), setSSRData ecrit dans une variable de
// module au lieu d'un <script> reel ; entry-server.tsx lit cette valeur
// apres renderToString() pour l'injecter elle-meme dans le HTML final.

let serverData: { route: string; data: unknown } | null = null;

export function setSSRData(route: string, data: unknown): void {
  serverData = { route, data };
}

export function consumeServerSSRData(): { route: string; data: unknown } | null {
  const value = serverData;
  serverData = null; // un seul render() par appel de entry-server -- jamais reutilise entre deux routes
  return value;
}

/**
 * Lit la donnee d'hydratation pour la route courante. Cote serveur, retourne
 * ce que setSSRData() a pose pour ce rendu. Cote client, lit le
 * <script id="__SSR_DATA__"> injecte dans le HTML statique.
 *
 * Volontairement SANS effet de bord (ne retire pas le <script> du DOM) :
 * un composant peut avoir besoin de lire cette valeur depuis PLUSIEURS
 * useState lazy-init au premier rendu (ex. `post` et `loading` derives tous
 * les deux de la meme donnee) -- un appel destructif casserait le second
 * appel. Le filtre `parsed.route === route` suffit a empecher une donnee
 * perimee de s'appliquer a une AUTRE route apres une navigation cote client.
 */
export function getSSRData<T>(route: string): T | null {
  if (typeof window === 'undefined') {
    const value = serverData;
    return value && value.route === route ? (value.data as T) : null;
  }

  const el = document.getElementById('__SSR_DATA__');
  if (!el?.textContent) return null;
  try {
    const parsed = JSON.parse(el.textContent) as { route: string; data: T };
    return parsed.route === route ? parsed.data : null;
  } catch {
    return null;
  }
}
