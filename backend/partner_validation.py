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
    partner_city = normalize_business_name(partner.get("city") or "").replace(" ", "")
    sirene_city = normalize_business_name(sirene.get("commune") or "").replace(" ", "")

    if not partner_city or not sirene_city:
        return True

    return partner_city in sirene_city or sirene_city in partner_city


def naf_check_passed(ai_report: dict[str, Any]) -> bool:
    for check in ai_report.get("checks") or []:
        label = f"{check.get('id', '')} {check.get('label', '')}".lower()
        if any(keyword in label for keyword in ("naf", "activité", "activite", "activity")):
            return bool(check.get("ok"))

    return ai_report.get("recommendation") == "approve"


def name_check_only_failure(ai_report: dict[str, Any]) -> bool:
    failed_checks = [
        check for check in (ai_report.get("checks") or []) if not check.get("ok")
    ]

    if not failed_checks:
        return False

    return all(
        any(
            keyword in f"{check.get('id', '')} {check.get('label', '')}".lower()
            for keyword in ("nom", "name", "enseigne", "raison", "commercial")
        )
        for check in failed_checks
    )


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

    if not cities_match_loosely(partner, sirene):
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
        if (
            sirene
            and sirene.get("found")
            and declared_name_matches_official(
                partner.get("name") or "",
                sirene.get("company_name") or "",
            )
            and name_check_only_failure(ai_report)
            and naf_check_passed(ai_report)
            and ai_report.get("recommendation") != "reject"
        ):
            boosted = dict(ai_report)
            boosted["auto_approve"] = True
            boosted["recommendation"] = "approve"
            boosted["confidence"] = max(float(ai_report.get("confidence") or 0), 0.99)
            boosted["summary"] = (
                ai_report.get("summary")
                or "Enseigne raccourcie cohérente avec la raison sociale SIRENE ; SIRET, adresse et activité validés."
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
4. L'adresse déclarée doit être cohérente avec l'adresse SIRENE (même commune / CP acceptable).
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

    return {
        **outcome,
        "validation_report": ai_report,
        "sirene_snapshot": sirene,
    }
