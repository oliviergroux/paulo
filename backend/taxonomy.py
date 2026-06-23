PARTNER_CATEGORIES = ["commerce", "service_local", "transport"]

REQUEST_CATEGORIES = ["commerce", "service_local", "transport", "mairie", "autre"]

PARTNER_SUBTYPES = {
    "commerce": [
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
    "service_local": [
        "plombier",
        "electricien",
        "maçon",
        "pisciniste",
        "petits_travaux",
        "autre",
    ],
    "transport": ["taxi"],
}

MAIRIE_SERVICES = [
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
]

REQUEST_SUBTYPES = {
    **PARTNER_SUBTYPES,
    "mairie": MAIRIE_SERVICES,
}

COMMERCE_SUBTYPE_HINTS = """
- fleuriste : bouquet, fleurs, composition florale, deuil, mariage
- boucher : viande, boucherie, charcuterie artisanale
- boulanger : pain, viennoiserie, boulangerie
- epicerie : épicerie de village, produits du quotidien, alimentation générale
- superette : supérette, petit supermarché local
- pharmacie : médicaments sans ordonnance, conseil pharma, parapharmacie
- fromager : fromagerie, crèmerie
- poissonnier : poissonnierie, fruits de mer
- restaurant : restaurant, traiteur, repas sur place ou à emporter
- cafe_bar : café, bar, brasserie, débit de boisson
- coiffeur : coiffure, barbier, salon de coiffure
- tabac_presse : bureau de tabac, presse, PMU, loto
- librairie_papeterie : librairie, papeterie, cartes, cadeaux
- quincaillerie : bricolage, droguerie, matériaux légers
- vetement : prêt-à-porter, boutique de vêtements, chaussures
- animalerie : animaux, alimentation animale, accessoires
- optique : lunettes, lentilles, opticien
- autre : commerce local non listé
"""

MAIRIE_SUBTYPE_HINTS = """
- voirie : nid de poule, route abîmée, trottoir, signalisation routière, marquage
- eclairage : lampadaire, éclairage public en panne
- propreté : dépôt sauvage, encombrants, poubelles, propreté urbaine
- espaces_verts : arbre, parc, jardin public, taille, branches
- eau_assainissement : fuite d'eau, canalisation, assainissement, inondation
- administratif : état civil, CNI, passeport, élections, formalités
- urbanisme : permis, construction, cadastre, PLU
- ecole_enfance : école, cantine, périscolaire, crèche, garderie
- sport_culture : médiathèque, salle des fêtes, équipements sportifs, animations
- nuisances : bruit, odeurs, stationnement gênant, incivilités
- renseignement : horaires mairie, contact service, renseignement général
- autre : demande publique non listée
"""

# Backward-compatible aliases used elsewhere in the codebase.
ALLOWED_CATEGORIES = PARTNER_CATEGORIES
ALLOWED_SUBTYPES = PARTNER_SUBTYPES


def validate_partner_category_subtype(category: str, subtype: str):
    category = category.strip().lower()
    subtype = subtype.strip().lower()

    if category not in PARTNER_CATEGORIES:
        return False, "invalid_category"

    if subtype not in PARTNER_SUBTYPES.get(category, []):
        return False, "invalid_subtype"

    return True, None


def validate_category_subtype(category: str, subtype: str):
    return validate_partner_category_subtype(category, subtype)


def validate_mairie_service(service: str):
    service = service.strip().lower()
    if service not in MAIRIE_SERVICES:
        return False, "invalid_service"
    return True, None


def normalize_partner_subtype(category: str, raw_subtype: str) -> str:
    category = category.strip().lower()
    subtype = raw_subtype.strip().lower().replace(" ", "_").replace("-", "_")

    aliases = {
        "macon": "maçon",
        "électricien": "electricien",
        "electricien": "electricien",
        "boulangerie": "boulanger",
        "pharma": "pharmacie",
        "bar": "cafe_bar",
        "cafe": "cafe_bar",
        "tabac": "tabac_presse",
        "presse": "tabac_presse",
        "librairie": "librairie_papeterie",
        "papeterie": "librairie_papeterie",
        "coiffure": "coiffeur",
    }

    subtype = aliases.get(subtype, subtype)

    allowed = PARTNER_SUBTYPES.get(category, [])
    if subtype in allowed:
        return subtype

    if "autre" in allowed:
        return "autre"

    return subtype


def normalize_request_subtype(category: str, raw_subtype: str) -> str:
    category = category.strip().lower()
    subtype = raw_subtype.strip().lower().replace(" ", "_").replace("-", "_")

    if category == "mairie":
        aliases = {
            "voirie_route": "voirie",
            "lampadaire": "eclairage",
            "dechets": "proprete",
            "decheterie": "proprete",
            "etat_civil": "administratif",
            "mairie": "autre",
        }
        subtype = aliases.get(subtype, subtype)
        allowed = MAIRIE_SERVICES
    else:
        subtype = normalize_partner_subtype(category, subtype)
        allowed = REQUEST_SUBTYPES.get(category, [])

    if subtype in allowed:
        return subtype

    if "autre" in allowed:
        return "autre"

    return subtype


def normalize_subtype(category: str, raw_subtype: str) -> str:
    return normalize_request_subtype(category, raw_subtype)


def build_subtype_classification_prompt(category: str, message_text: str) -> str:
    category = category.strip().lower()

    if category == "commerce":
        options = "\n".join(f"- {s}" for s in REQUEST_SUBTYPES["commerce"])
        return f"""
Tu dois extraire un sous-type de commerce local à partir de la demande.

Réponds par UN seul mot exact parmi :
{options}

Guide :
{COMMERCE_SUBTYPE_HINTS}

Demande : {message_text}

Réponds uniquement par le sous-type exact, sans phrase.
"""

    if category == "mairie":
        options = "\n".join(f"- {s}" for s in MAIRIE_SERVICES)
        return f"""
Tu dois extraire un sous-type de demande communale à partir de la demande.

Réponds par UN seul mot exact parmi :
{options}

Guide :
{MAIRIE_SUBTYPE_HINTS}

Demande : {message_text}

Réponds uniquement par le sous-type exact, sans phrase.
"""

    if category == "service_local":
        return f"""
Tu dois extraire un sous-type précis à partir de la demande.

Réponds par un seul mot parmi :
- plombier
- electricien
- maçon
- pisciniste
- petits_travaux
- autre

Demande : {message_text}

Réponds uniquement par le sous-type exact.
"""

    if category == "transport":
        return "taxi"

    return "autre"
