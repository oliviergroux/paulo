import json
import os
import re
from typing import Any, Optional

import requests
from openai import OpenAI

from taxonomy import PARTNER_SUBTYPES, subtype_label

SIRENE_SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search"
AUTO_APPROVE_CONFIDENCE = 0.99

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def normalize_siret(raw: str) -> Optional[str]:
    digits = re.sub(r"\D", "", raw or "")
    return digits if len(digits) == 14 else None


def lookup_siret(raw_siret: str) -> Optional[dict[str, Any]]:
    siret = normalize_siret(raw_siret)
    if not siret:
        return None

    try:
        response = requests.get(
            SIRENE_SEARCH_URL,
            params={"q": siret, "per_page": 5},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return None

    results = payload.get("results") or []
    if not results:
        return None

    company = results[0]
    establishment = None
    siret_exact_match = False

    siege = company.get("siege") or {}
    if siege.get("siret") == siret:
        establishment = siege
        siret_exact_match = True
    else:
        for etab in company.get("matching_etablissements") or []:
            if etab.get("siret") == siret:
                establishment = etab
                siret_exact_match = True
                break

        if establishment is None and company.get("siren") == siret[:9]:
            establishment = siege
            siret_exact_match = siege.get("siret") == siret

    if not establishment:
        return {
            "found": False,
            "siret": siret,
            "company_name": company.get("nom_complet")
            or company.get("nom_raison_sociale"),
            "siren": company.get("siren"),
        }

    return {
        "found": True,
        "siret": siret,
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


def _build_subtype_context(category: str) -> str:
    subtypes = PARTNER_SUBTYPES.get(category, [])
    return ", ".join(f"{subtype} ({subtype_label(subtype)})" for subtype in subtypes)


def analyze_partner_with_ai(
    partner: dict[str, Any],
    sirene: Optional[dict[str, Any]],
) -> dict[str, Any]:
    prompt = f"""
Tu es l'agent de validation partenaire de Paulo (réseau local de commerces, artisans, transport).

Compare la déclaration du partenaire avec les données officielles SIRENE (si disponibles).

Déclaration partenaire :
- Nom déclaré : {partner.get("name")}
- SIRET : {partner.get("siret")}
- Téléphone : {partner.get("phone")}
- Adresse déclarée : {partner.get("address")}
- Catégorie Paulo : {partner.get("category")}
- Sous-type Paulo : {partner.get("subtype")} ({subtype_label(partner.get("subtype", ""))})
- Sous-types possibles pour cette catégorie : {_build_subtype_context(partner.get("category", ""))}

Données SIRENE :
{json.dumps(sirene or {"found": False}, ensure_ascii=False, indent=2)}

Règles :
1. Le SIRET doit exister et l'établissement doit être actif (etat_administratif = A).
2. Le nom déclaré doit correspondre raisonnablement au nom officiel (enseigne ou raison sociale).
3. L'adresse déclarée doit être cohérente avec l'adresse SIRENE (même commune / CP acceptable).
4. Le code NAF / activité doit être compatible avec le sous-type Paulo déclaré.
5. Le téléphone n'est pas vérifiable via SIRENE — ne bloque pas une validation auto si le reste est parfait.

Réponds UNIQUEMENT en JSON valide avec cette structure :
{{
  "confidence": 0.0,
  "recommendation": "approve" | "review" | "reject",
  "auto_approve": false,
  "summary": "Résumé court en français pour l'admin",
  "checks": [
    {{
      "id": "siret_found",
      "label": "SIRET trouvé",
      "ok": true,
      "detail": "..."
    }}
  ]
}}

auto_approve = true UNIQUEMENT si tu es certain à 100% (confidence >= 0.99) ET SIRET actif ET nom/adresse/activité cohérents.
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
        and sirene.get("siret_exact_match", True)
    )

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
    outcome = resolve_validation_outcome(ai_report, sirene)

    return {
        **outcome,
        "validation_report": ai_report,
        "sirene_snapshot": sirene,
    }
