export const PARTNER_CATEGORIES = ["commerce", "service_local", "transport"] as const;

export const PARTNER_SUBTYPES: Record<string, string[]> = {
  commerce: [
    "fleuriste",
    "boucher",
    "boulanger",
    "epicerie",
    "superette",
    "pharmacie",
    "fromager",
    "poissonnier",
    "restaurant",
    "cafe_bar",
    "coiffeur",
    "tabac_presse",
    "librairie_papeterie",
    "quincaillerie",
    "vetement",
    "animalerie",
    "optique",
    "autre",
  ],
  service_local: [
    "plombier",
    "electricien",
    "maçon",
    "pisciniste",
    "petits_travaux",
    "autre",
  ],
  transport: ["taxi"],
};

/** Sujets de demandes mairie — classification IA et assignation interne. */
export const MAIRIE_SERVICES = [
  "voirie",
  "eclairage",
  "proprete",
  "espaces_verts",
  "eau_assainissement",
  "administratif",
  "urbanisme",
  "ecole_enfance",
  "sport_culture",
  "nuisances",
  "renseignement",
  "autre",
] as const;

/** Alias pour les formulaires partenaire. */
export const SUBTYPES = PARTNER_SUBTYPES;

export const SUBTYPE_LABELS: Record<string, string> = {
  fleuriste: "Fleuriste",
  boucher: "Boucher / charcutier",
  boulanger: "Boulanger",
  epicerie: "Épicerie",
  superette: "Supérette",
  pharmacie: "Pharmacie",
  fromager: "Fromager",
  poissonnier: "Poissonnier",
  restaurant: "Restaurant / traiteur",
  cafe_bar: "Café / bar",
  coiffeur: "Coiffeur",
  tabac_presse: "Tabac / presse",
  librairie_papeterie: "Librairie / papeterie",
  quincaillerie: "Quincaillerie / bricolage",
  vetement: "Vêtements / chaussures",
  animalerie: "Animalerie",
  optique: "Optique",
  plombier: "Plombier",
  electricien: "Électricien",
  maçon: "Maçon",
  pisciniste: "Pisciniste",
  petits_travaux: "Petits travaux",
  taxi: "Taxi",
  voirie: "Voirie / signalisation",
  eclairage: "Éclairage public",
  proprete: "Propreté / déchets",
  espaces_verts: "Espaces verts",
  eau_assainissement: "Eau / assainissement",
  administratif: "Administratif / état civil",
  urbanisme: "Urbanisme / permis",
  ecole_enfance: "École / petite enfance",
  sport_culture: "Sport / culture",
  nuisances: "Nuisances / incivilités",
  renseignement: "Renseignement",
  autre: "Autre",
};

export function subtypeLabel(subtype: string): string {
  return SUBTYPE_LABELS[subtype] || subtype.replace(/_/g, " ");
}

export function mairieServiceOptions() {
  return MAIRIE_SERVICES.map((service) => ({
    id: service,
    label: subtypeLabel(service),
  }));
}

export const CATEGORY_LABELS: Record<string, string> = {
  commerce: "Commerce",
  service_local: "Service local",
  transport: "Transport",
  mairie: "Collectivité",
  autre: "Autre",
};

export const PARTNER_CATEGORY_LABELS: Record<string, string> = {
  commerce: "Commerce",
  service_local: "Service local",
  transport: "Transport",
};
