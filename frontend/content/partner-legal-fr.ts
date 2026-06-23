/** Textes légaux candidature partenaire — à adapter si changement d’éditeur ou DPO. */
export const LEGAL_CONTACT_EMAIL = "contact@paulo.fr";

export const PARTNER_FORM_SIRET_NOTICE =
  "SIREN (9 chiffres) ou SIRET (14 chiffres) — vérifié auprès du registre officiel (data.gouv.fr). Avec un SIREN, nous comparons votre dossier au siège social.";

export const PARTNER_FORM_VALIDATION_NOTICE =
  "Nous analysons la cohérence de votre dossier (nom, adresse, activité). En cas de doute, un administrateur valide manuellement. Vous pouvez contester une décision en écrivant à " +
  LEGAL_CONTACT_EMAIL +
  ".";

export const PARTNER_CGU_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. Objet",
    paragraphs: [
      "Les présentes conditions régissent l’accès au réseau de partenaires Paulo et l’utilisation de l’espace partenaire associé.",
      "Paulo met en relation des demandes locales (habitants, collectivités) avec des professionnels de proximité. Paulo n’est pas une marketplace ouverte : chaque partenaire est sélectionné et validé.",
    ],
  },
  {
    title: "2. Admission au réseau",
    paragraphs: [
      "L’inscription ouvre une demande d’admission. L’activation du profil et la réception de demandes sont subordonnées à une validation par Paulo.",
      "Paulo se réserve le droit de refuser ou de suspendre un partenaire dont le dossier est incomplet, incohérent ou non conforme à l’activité déclarée.",
    ],
  },
  {
    title: "3. Vérification d’identité professionnelle",
    paragraphs: [
      "Pour garantir la fiabilité du réseau, Paulo vérifie les informations professionnelles fournies lors de l’inscription, notamment :",
      "• le numéro SIRET, consulté auprès du registre officiel des entreprises (API publique data.gouv.fr / SIRENE) ;",
      "• la cohérence entre le nom, l’adresse et l’activité déclarés et les données publiques associées au SIRET ;",
      "• la compatibilité de l’activité (code NAF) avec la catégorie Paulo choisie.",
      "Ces vérifications ont pour seule finalité la lutte contre les dossiers frauduleux ou erronés et la protection des habitants et des collectivités partenaires.",
      "Les données SIRENE utilisées sont des données publiques d’entreprise. Paulo ne réalise pas de contrôle de solvabilité ni d’enquête de moralité.",
    ],
  },
  {
    title: "4. Traitement automatisé et revue humaine",
    paragraphs: [
      "Une partie de l’analyse de cohérence du dossier peut être assistée par un outil automatique. En cas de doute, un administrateur Paulo examine le dossier avant activation.",
      "Si votre dossier est refusé ou suspendu, vous pouvez demander une réexamen humain en contactant " +
        LEGAL_CONTACT_EMAIL +
        ".",
      "Paulo ne fonde pas une décision définitive de refus uniquement sur un traitement entièrement automatisé sans possibilité d’intervention humaine.",
    ],
  },
  {
    title: "5. Obligations du partenaire",
    paragraphs: [
      "Vous vous engagez à fournir des informations exactes et à les mettre à jour en cas de changement (SIRET, adresse, activité, coordonnées).",
      "Vous vous engagez à traiter les demandes reçues via Paulo avec diligence et dans le respect de la réglementation applicable à votre profession.",
    ],
  },
  {
    title: "6. Durée et conservation",
    paragraphs: [
      "Les éléments de vérification (copie des données SIRENE consultées, rapport d’analyse) sont conservés pendant la durée de la relation partenaire, puis archivés conformément aux obligations légales et à la politique de confidentialité.",
    ],
  },
  {
    title: "7. Contact",
    paragraphs: [
      "Pour toute question relative aux présentes conditions : " + LEGAL_CONTACT_EMAIL + ".",
    ],
  },
];

export const PARTNER_PRIVACY_SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. Responsable du traitement",
    paragraphs: [
      "Le responsable du traitement des données collectées dans le cadre de la candidature partenaire est Paulo (" +
        LEGAL_CONTACT_EMAIL +
        ").",
    ],
  },
  {
    title: "2. Données collectées",
    paragraphs: [
      "Lors de votre candidature, nous collectons notamment : nom ou raison sociale, SIRET, téléphone, adresse (voie), code postal, ville, email, catégorie et sous-type d’activité Paulo.",
      "Nous enregistrons également le résultat de la vérification SIRET (données publiques consultées) et, le cas échéant, un rapport d’analyse interne de cohérence du dossier.",
    ],
  },
  {
    title: "3. Finalités et bases légales",
    paragraphs: [
      "• Instruction et validation de votre candidature (base légale : mesures précontractuelles / exécution du contrat).",
      "• Lutte contre les dossiers frauduleux ou incohérents (base légale : intérêt légitime de Paulo et des collectivités partenaires).",
      "• Gestion de la relation partenaire et envoi de notifications liées aux demandes (base légale : exécution du contrat).",
    ],
  },
  {
    title: "4. Registre SIRENE (data.gouv.fr)",
    paragraphs: [
      "Le SIRET est contrôlé via l’API publique de recherche d’entreprises de l’État. Les informations consultées (raison sociale, adresse de l’établissement, activité NAF, état administratif) sont des données publiques d’entreprise.",
      "Paulo ne les réutilise pas à d’autres fins que la validation du dossier partenaire.",
    ],
  },
  {
    title: "5. Sous-traitants",
    paragraphs: [
      "Pour le fonctionnement de la plateforme, certaines données peuvent être traitées par des prestataires techniques (hébergement, messagerie) et, pour l’analyse de cohérence du dossier, par un prestataire d’intelligence artificielle.",
      "Ces prestataires agissent en qualité de sous-traitants dans le cadre de contrats encadrant la protection des données. Des transferts hors Union européenne peuvent intervenir lorsque le sous-traitant est établi aux États-Unis ; ils sont encadrés par les garanties applicables (clauses contractuelles types ou mécanisme équivalent).",
    ],
  },
  {
    title: "6. Durée de conservation",
    paragraphs: [
      "Les données de candidature et de vérification sont conservées pendant la durée de la relation partenaire.",
      "En l’absence de relation active, elles peuvent être conservées jusqu’à 3 ans à des fins de preuve et de gestion des litiges, sauf obligation légale contraire.",
    ],
  },
  {
    title: "7. Vos droits",
    paragraphs: [
      "Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité lorsque applicable.",
      "Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).",
      "Pour exercer vos droits : " + LEGAL_CONTACT_EMAIL + ".",
    ],
  },
];
