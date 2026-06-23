import json
import os
import re
import unicodedata
from typing import Any, Literal, Optional

import requests
from openai import OpenAI

from taxonomy import PARTNER_SUBTYPES, subtype_label

SIRENE_SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search"
AUTO_APPROVE_CONFIDENCE = 0.99

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CompanyIdKind = Literal["siret", "siren"]


def normalize_company_identifier(raw: str) -> Optional[tuple[str, CompanyIdKind]]:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 14:
        return digits, "siret"
    if len(digits) == 9:
        return digits, "siren"
    return None


def normalize_siret(raw: str) -> Optional[str]:
    parsed = normalize_company_identifier(raw)
    if not parsed:
        return None
    return parsed[0]


def _build_company_snapshot(
    company: dict[str, Any],
    establishment: dict[str, Any],
    *,
    input_value: str,
    input_kind: CompanyIdKind,
    siret_exact_match: bool,
    found: bool,
) -> dict[str, Any]:
    return {
        "found": found,
        "input_kind": input_kind,
        "input_value": input_value,
        "siret": establishment.get("siret") or input_value,
        "siret_exact_match": siret_exact_match,
        "company_name": company.get("nom_complet")
        or company.get("nom_raison_sociale"),
        "siren": company.get("siren"),
        "official_address": establishment.get("adresse"),
        "code_postal": establishment.get("code_postal"),
        "commune": establishment.get("libelle_commune"),
        "activite_principale": establishment.get("activite_principale")
        or company.get("activite_principale"),
        "activite_principale_naf25": establishment.get("activite_principale_naf25")
        or company.get("activite_principale_naf25"),
        "etat_administratif": establishment.get("etat_administratif"),
        "date_creation": establishment.get("date_creation"),
        "establishment_siret": establishment.get("siret"),
    }


def _search_sirene(query: str) -> list[dict[str, Any]]:
    try:
        response = requests.get(
            SIRENE_SEARCH_URL,
            params={"q": query, "per_page": 10},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return []

    return payload.get("results") or []


def _find_company_by_siren(
    results: list[dict[str, Any]], siren: str
) -> Optional[dict[str, Any]]:
    for company in results:
        if company.get("siren") == siren:
            return company
    return results[0] if results else None


def lookup_siret(raw_identifier: str) -> Optional[dict[str, Any]]:
    parsed = normalize_company_identifier(raw_identifier)
    if not parsed:
        return None

    identifier, kind = parsed
    results = _search_sirene(identifier)
    if not results:
        return None

    if kind == "siren":
        company = _find_company_by_siren(results, identifier)
        if not company:
            return None

        establishment = company.get("siege") or {}
        if not establishment:
            return {
                "found": False,
                "input_kind": "siren",
                "input_value": identifier,
                "siret": identifier,
                "siret_exact_match": False,
                "company_name": company.get("nom_complet")
                or company.get("nom_raison_sociale"),
                "siren": company.get("siren"),
            }

        return _build_company_snapshot(
            company,
            establishment,
            input_value=identifier,
            input_kind="siren",
            siret_exact_match=False,
            found=True,
        )

    siret = identifier
    company = None
    establishment = None
    siret_exact_match = False

    for candidate in results:
        siege = candidate.get("siege") or {}
        if siege.get("siret") == siret:
            company = candidate
            establishment = siege
            siret_exact_match = True
            break

        for etab in candidate.get("matching_etablissements") or []:
            if etab.get("siret") == siret:
                company = candidate
                establishment = etab
                siret_exact_match = True
                break

        if establishment:
            break

        if candidate.get("siren") == siret[:9]:
            company = candidate
            establishment = candidate.get("siege") or {}
            siret_exact_match = establishment.get("siret") == siret
            break

    if not company:
        company = results[0]

    if not establishment:
        return {
            "found": False,
            "input_kind": "siret",
            "input_value": siret,
            "siret": siret,
            "siret_exact_match": False,
            "company_name": company.get("nom_complet")
            or company.get("nom_raison_sociale"),
            "siren": company.get("siren"),
        }

    return _build_company_snapshot(
        company,
        establishment,
        input_value=siret,
        input_kind="siret",
        siret_exact_match=siret_exact_match,
        found=True,
    )


def _build_subtype_context(category: str) -> str:
    subtypes = PARTNER_SUBTYPES.get(category, [])
    return ", ".join(f"{subtype} ({subtype_label(subtype)})" for subtype in subtypes)


NAME_STOP_WORDS = {
    "sarl",
    "sas",
    "eurl",
    "sa",
    "sci",
    "sasu",
    "eirl",
    "ei",
    "et",
    "de",
    "la",
    "le",
    "les",
    "du",
    "des",
    "l",
    "d",
}


def normalize_business_name(value: str) -> str:
    text = (value or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("'", " ").replace("-", " ")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def business_name_tokens(value: str) -> list[str]:
    return [
        token
        for token in normalize_business_name(value).split()
        if len(token) >= 2 and token not in NAME_STOP_WORDS
    ]


ADDRESS_STOP_WORDS = {
    *NAME_STOP_WORDS,
    "rue",
    "avenue",
    "av",
    "bd",
    "boulevard",
    "chemin",
    "impasse",
    "place",
    "allée",
    "allee",
    "route",
    "za",
    "zi",
}


def normalize_city_key(value: str) -> str:
    tokens = []
    for token in normalize_business_name(value).split():
        if token in {"lez", "les"}:
            tokens.append("les")
        elif token == "st":
            tokens.append("saint")
        elif token in {"sur", "sous", "en"}:
            continue
        else:
            tokens.append(token)
    return "".join(tokens)


def address_significant_tokens(value: str) -> list[str]:
    return [
        token
        for token in normalize_business_name(value).split()
        if len(token) >= 2
        and token not in ADDRESS_STOP_WORDS
        and not token.isdigit()
    ]


def partner_street_line(partner: dict[str, Any]) -> str:
    return (partner.get("address_line") or partner.get("address") or "").strip()


def partner_declared_address_blob(partner: dict[str, Any]) -> str:
    parts = [
        partner_street_line(partner),
        (partner.get("postal_code") or "").strip(),
        (partner.get("city") or "").strip(),
    ]
    joined = ", ".join(part for part in parts if part)
    return joined or (partner.get("address") or "").strip()


def street_numbers_match(left: str, right: str) -> bool:
    left_num = re.search(r"\b(\d+[a-z]?)\b", normalize_business_name(left))
    right_num = re.search(r"\b(\d+[a-z]?)\b", normalize_business_name(right))
    if not left_num or not right_num:
        return True
    return left_num.group(1) == right_num.group(1)


def declared_address_matches_official(
    partner: dict[str, Any],
    sirene: dict[str, Any],
) -> bool:
    if not postal_codes_match(partner, sirene):
        return False

    declared_city = partner.get("city") or ""
    official_city = sirene.get("commune") or ""
    if declared_city and official_city:
        declared_city_key = normalize_city_key(declared_city)
        official_city_key = normalize_city_key(official_city)
        if declared_city_key != official_city_key and declared_city_key not in official_city_key and official_city_key not in declared_city_key:
            declared_city_tokens = set(address_significant_tokens(declared_city))
            official_city_tokens = set(address_significant_tokens(official_city))
            if declared_city_tokens and not all(
                token in official_city_tokens for token in declared_city_tokens
            ):
                return False

    declared_street = partner_street_line(partner)
    official_street = sirene.get("official_address") or ""
    declared_full = partner_declared_address_blob(partner)

    if not official_street and not declared_street:
        return True

    if not street_numbers_match(declared_street or declared_full, official_street):
        return False

    declared_norm = normalize_business_name(declared_full)
    official_norm = normalize_business_name(
        " ".join(
            part
            for part in [official_street, sirene.get("code_postal"), sirene.get("commune")]
            if part
        )
    )

    if declared_norm and official_norm:
        if declared_norm == official_norm:
            return True
        if declared_norm in official_norm or official_norm in declared_norm:
            return True

    declared_tokens = address_significant_tokens(declared_street or declared_full)
    official_tokens = set(address_significant_tokens(official_street))

    if declared_tokens and official_tokens:
        if all(token in official_tokens for token in declared_tokens):
            return True

        significant = [token for token in declared_tokens if len(token) >= 4]
        if significant and all(token in official_tokens for token in significant):
            return True

    return False


def partner_canonical_fields_from_sirene(
    partner: dict[str, Any],
    sirene: Optional[dict[str, Any]],
) -> dict[str, str]:
    if not sirene or not sirene.get("found"):
        return {}

    updates: dict[str, str] = {}

    official_name = (sirene.get("company_name") or "").strip()
    declared_name = (partner.get("name") or "").strip()
    if (
        official_name
        and declared_name
        and declared_name_matches_official(declared_name, official_name)
        and normalize_business_name(declared_name) != normalize_business_name(official_name)
    ):
        updates["name"] = official_name

    if declared_address_matches_official(partner, sirene):
        official_street = (sirene.get("official_address") or "").strip()
        official_postal = re.sub(r"\D", "", sirene.get("code_postal") or "")
        official_city = (sirene.get("commune") or "").strip()

        declared_street = partner_street_line(partner)
        declared_postal = re.sub(r"\D", "", partner.get("postal_code") or "")
        declared_city = (partner.get("city") or "").strip()

        address_differs = bool(
            official_street
            and normalize_business_name(declared_street)
            != normalize_business_name(official_street)
        )
        postal_differs = bool(official_postal and declared_postal != official_postal)
        city_differs = bool(
            official_city
            and normalize_city_key(declared_city) != normalize_city_key(official_city)
        )

        if address_differs or postal_differs or city_differs:
            if official_street:
                updates["address"] = official_street
            if official_postal:
                updates["postal_code"] = official_postal
            if official_city:
                updates["city"] = official_city

    return updates


def declared_name_matches_official(declared: str, official: str) -> bool:
    declared_norm = normalize_business_name(declared)
    official_norm = normalize_business_name(official)

    if not declared_norm or not official_norm:
        return False

    if declared_norm == official_norm:
        return True

    if declared_norm in official_norm or official_norm in declared_norm:
        return True

    declared_tokens = business_name_tokens(declared)
    official_tokens = set(business_name_tokens(official))

    if not declared_tokens:
        return False

    if all(token in official_tokens for token in declared_tokens):
        return True

    significant = [token for token in declared_tokens if len(token) >= 4]
    return bool(significant) and all(token in official_tokens for token in significant)


def postal_codes_match(partner: dict[str, Any], sirene: dict[str, Any]) -> bool:
    partner_postal = re.sub(r"\D", "", partner.get("postal_code") or "")
    sirene_postal = re.sub(r"\D", "", sirene.get("code_postal") or "")
    if len(partner_postal) != 5:
        return extract_postal_code(partner.get("address") or "") == sirene_postal
    return partner_postal == sirene_postal


def extract_postal_code(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"\b(\d{5})\b", text)
    return match.group(1) if match else None


def cities_match_loosely(partner: dict[str, Any], sirene: dict[str, Any]) -> bool:
    partner_city = normalize_city_key(partner.get("city") or "")
    sirene_city = normalize_city_key(sirene.get("commune") or "")

    if not partner_city or not sirene_city:
        return True

    return (
        partner_city == sirene_city
        or partner_city in sirene_city
        or sirene_city in partner_city
    )


def naf_check_passed(ai_report: dict[str, Any]) -> bool:
    for check in ai_report.get("checks") or []:
        label = f"{check.get('id', '')} {check.get('label', '')}".lower()
        if any(keyword in label for keyword in ("naf", "activité", "activite", "activity")):
            return bool(check.get("ok"))

    return ai_report.get("recommendation") == "approve"


def identity_soft_check_only_failure(ai_report: dict[str, Any]) -> bool:
    failed_checks = [
        check for check in (ai_report.get("checks") or []) if not check.get("ok")
    ]

    if not failed_checks:
        return False

    soft_keywords = (
        "nom",
        "name",
        "enseigne",
        "raison",
        "commercial",
        "adresse",
        "address",
        "ville",
        "commune",
        "postal",
        "cp",
        "correspondance",
    )

    return all(
        any(
            keyword in f"{check.get('id', '')} {check.get('label', '')}".lower()
            for keyword in soft_keywords
        )
        for check in failed_checks
    )


def name_check_only_failure(ai_report: dict[str, Any]) -> bool:
    return identity_soft_check_only_failure(ai_report)


def hard_facts_support_auto_approve(
    partner: dict[str, Any],
    sirene: Optional[dict[str, Any]],
    ai_report: dict[str, Any],
) -> bool:
    if not sirene or not sirene.get("found"):
        return False

    if sirene.get("etat_administratif") != "A":
        return False

    if not sirene.get("siret_exact_match") or sirene.get("input_kind") != "siret":
        return False

    if ai_report.get("recommendation") == "reject":
        return False

    if not postal_codes_match(partner, sirene):
        return False

    if not declared_address_matches_official(partner, sirene):
        return False

    if not declared_name_matches_official(
        partner.get("name") or "",
        sirene.get("company_name") or "",
    ):
        return False

    if not naf_check_passed(ai_report):
        return False

    return True


def maybe_boost_ai_report_for_trade_name(
    partner: dict[str, Any],
    sirene: Optional[dict[str, Any]],
    ai_report: dict[str, Any],
) -> dict[str, Any]:
    if not hard_facts_support_auto_approve(partner, sirene, ai_report):
        name_ok = declared_name_matches_official(
            partner.get("name") or "",
            sirene.get("company_name") or "" if sirene else "",
        )
        address_ok = bool(
            sirene
            and sirene.get("found")
            and postal_codes_match(partner, sirene)
            and declared_address_matches_official(partner, sirene)
        )
        if (
            sirene
            and sirene.get("found")
            and sirene.get("etat_administratif") == "A"
            and sirene.get("siret_exact_match")
            and sirene.get("input_kind") == "siret"
            and name_ok
            and address_ok
            and identity_soft_check_only_failure(ai_report)
            and naf_check_passed(ai_report)
            and ai_report.get("recommendation") != "reject"
        ):
            boosted = dict(ai_report)
            boosted["auto_approve"] = True
            boosted["recommendation"] = "approve"
            boosted["confidence"] = max(float(ai_report.get("confidence") or 0), 0.99)
            boosted["summary"] = (
                ai_report.get("summary")
                or "Dossier cohérent avec SIRENE : enseigne et adresse acceptées malgré des différences de forme (casse, lez/les, articles)."
            )
            return boosted
        return ai_report

    boosted = dict(ai_report)
    boosted["auto_approve"] = True
    boosted["recommendation"] = "approve"
    boosted["confidence"] = max(float(ai_report.get("confidence") or 0), 0.99)
    if not boosted.get("summary"):
        boosted["summary"] = (
            "SIRET actif, adresse et activité cohérents. "
            "Le nom déclaré correspond à l'enseigne ou à un extrait du nom officiel."
        )
    return boosted


def analyze_partner_with_ai(
    partner: dict[str, Any],
    sirene: Optional[dict[str, Any]],
) -> dict[str, Any]:
    input_kind = (sirene or {}).get("input_kind")
    identifier_label = "SIREN" if input_kind == "siren" else "SIRET / SIREN"

    prompt = f"""
Tu es l'agent de validation partenaire de Paulo (réseau local de commerces, artisans, transport).

Compare la déclaration du partenaire avec les données officielles SIRENE (si disponibles).

Déclaration partenaire :
- Nom déclaré : {partner.get("name")}
- {identifier_label} déclaré : {partner.get("siret")}
- Téléphone : {partner.get("phone")}
- Adresse (voie) : {partner.get("address_line") or partner.get("address")}
- Code postal : {partner.get("postal_code")}
- Ville : {partner.get("city")}
- Adresse complète : {partner.get("address")}
- Email : {partner.get("email")}
- Catégorie Paulo : {partner.get("category")}
- Sous-type Paulo : {partner.get("subtype")} ({subtype_label(partner.get("subtype", ""))})
- Sous-types possibles pour cette catégorie : {_build_subtype_context(partner.get("category", ""))}

Données SIRENE :
{json.dumps(sirene or {"found": False}, ensure_ascii=False, indent=2)}

Règles :
1. L'entreprise doit exister dans SIRENE et l'établissement retenu doit être actif (etat_administratif = A).
2. Si seul un SIREN (9 chiffres) a été fourni, la comparaison se fait avec le siège social — c'est acceptable mais ne force pas auto_approve.
3. Nom / enseigne : les commerçants et artisans utilisent souvent une enseigne courte ou commerciale différente de la raison sociale complète.
   - Exemples VALIDES : déclaré "L'Ardéchoise" / officiel "BOUCHERIE CHARCUTERIE L'ARDÉCHOISE" ; déclaré "Plomberie Martin" / officiel "MARTIN PLOMBERIE SARL".
   - Considère OK si le nom déclaré est contenu dans le nom officiel, si tous les mots significatifs du nom déclaré apparaissent dans le nom officiel, ou s'il s'agit clairement de la même enseigne.
   - Ne mets PAS en review uniquement pour une différence enseigne vs raison sociale si SIRET exact, adresse/CP/ville cohérents et NAF compatible.
   - Bloque seulement si le nom déclaré n'a aucun lien crédible avec le nom officiel (fraude évidente).
4. Adresse : tolère les différences de forme courantes si le fond est le même établissement.
   - Exemples VALIDES : "18 rue maréchal de boufflers, 59350 Saint André les lille" vs "18 RUE DU MARECHAL DE BOUFFLERS 59350 SAINT-ANDRE-LEZ-LILLE" (casse, DU absent, lez/les, tirets).
   - Considère OK si même numéro de voie, même code postal, même commune (lez/les, saint/st, accents, tirets).
   - Ne mets PAS en review pour une simple différence de casse, d'article (du/de), ou de libellé communal proche.
   - Bloque seulement si CP, commune ou numéro de voie ne correspondent pas.
5. Le code NAF / activité doit être compatible avec le sous-type Paulo déclaré.
6. Le téléphone et l'email ne sont pas vérifiables via SIRENE — ne bloquent jamais une validation auto si le reste est solide.

Réponds UNIQUEMENT en JSON valide avec cette structure :
{{
  "confidence": 0.0,
  "recommendation": "approve" | "review" | "reject",
  "auto_approve": false,
  "summary": "Résumé court en français pour l'admin",
  "checks": [
    {{
      "id": "company_found",
      "label": "Entreprise trouvée",
      "ok": true,
      "detail": "..."
    }}
  ]
}}

auto_approve = true si tu es certain (confidence >= 0.99) ET établissement actif ET SIRET exact fourni (input_kind = siret) ET adresse/CP/ville cohérents ET NAF compatible ET le nom déclaré est une enseigne valide (même courte) du nom officiel.
Ne mets recommendation = review QUE si un doute réel subsiste (SIRET, adresse, NAF ou nom sans lien crédible).
Sinon recommendation = review sauf fraude évidente (reject).
"""

    try:
        result = client.responses.create(
            model="gpt-4o-mini",
            input=prompt,
        )
        raw = (result.output_text or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise ValueError("invalid_ai_payload")
        return parsed
    except Exception as exc:
        return {
            "confidence": 0.0,
            "recommendation": "review",
            "auto_approve": False,
            "summary": "Analyse IA indisponible — validation manuelle requise.",
            "checks": [
                {
                    "id": "ai_analysis",
                    "label": "Analyse IA",
                    "ok": False,
                    "detail": str(exc),
                }
            ],
        }


def resolve_validation_outcome(
    ai_report: dict[str, Any],
    sirene: Optional[dict[str, Any]],
) -> dict[str, Any]:
    confidence = float(ai_report.get("confidence") or 0)
    auto_approve = bool(ai_report.get("auto_approve"))
    recommendation = ai_report.get("recommendation") or "review"

    sirene_active = (
        sirene
        and sirene.get("found")
        and sirene.get("etat_administratif") == "A"
    )
    siret_exact = bool(sirene and sirene.get("siret_exact_match"))

    if recommendation == "reject":
        return {
            "validation_status": "rejected",
            "is_active": False,
            "validation_confidence": confidence,
            "auto_approved": False,
        }

    if (
        auto_approve
        and confidence >= AUTO_APPROVE_CONFIDENCE
        and sirene_active
        and siret_exact
        and sirene.get("input_kind") == "siret"
        and recommendation == "approve"
    ):
        return {
            "validation_status": "auto_validated",
            "is_active": True,
            "validation_confidence": confidence,
            "auto_approved": True,
        }

    return {
        "validation_status": "needs_review",
        "is_active": False,
        "validation_confidence": confidence,
        "auto_approved": False,
    }


def validate_partner_application(partner: dict[str, Any]) -> dict[str, Any]:
    sirene = lookup_siret(partner.get("siret", ""))
    ai_report = analyze_partner_with_ai(partner, sirene)
    ai_report = maybe_boost_ai_report_for_trade_name(partner, sirene, ai_report)
    outcome = resolve_validation_outcome(ai_report, sirene)

    canonical_fields: dict[str, str] = {}
    if outcome["validation_status"] != "rejected":
        canonical_fields = partner_canonical_fields_from_sirene(partner, sirene)
        if canonical_fields:
            ai_report = dict(ai_report)
            ai_report["sirene_canonicalized"] = canonical_fields

    return {
        **outcome,
        "validation_report": ai_report,
        "sirene_snapshot": sirene,
        "canonical_fields": canonical_fields,
    }
