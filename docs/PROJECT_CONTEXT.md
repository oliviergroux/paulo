# PAULO - PROJECT CONTEXT

## Vision

Paulo est une plateforme de gestion des demandes locales.

L'objectif est de permettre à un habitant d'envoyer une demande simplement (appel téléphonique ou WhatsApp), puis de la distribuer efficacement à la mairie ou à un partenaire local.

Paulo n'est PAS une marketplace.

Paulo est un orchestrateur de demandes locales.

Le système doit rester simple pour les habitants, simple pour les partenaires et simple pour les collectivités.

---

# Positionnement

## Ce que Paulo est

* Gestion des demandes habitants
* CRM local
* Outil de relation habitants
* Réseau de partenaires locaux validés
* Plateforme de services territoriaux

## Ce que Paulo n'est pas

* Uber
* Malt
* Fiverr
* Marketplace ouverte
* Plateforme de devis concurrents

---

# Utilisateurs

## Habitants

Peuvent :

* Appeler un numéro
* Envoyer un WhatsApp
* Exprimer un besoin librement

Exemples :

* J'ai besoin d'un plombier
* Je cherche un bouquet pour demain
* Un lampadaire est cassé
* J'ai besoin d'un taxi

---

## Partenaires

Types :

* Fleuriste
* Boucher
* Plombier
* Electricien
* Maçon
* Pisciniste
* Petits travaux
* Taxi

Peuvent :

* Recevoir des demandes
* Consulter leur tableau de bord
* Voir les informations client
* Gérer leurs demandes

Tous les partenaires doivent être validés manuellement.

---

## Mairies

Peuvent :

* Voir toutes les demandes
* Voir les habitants
* Voir les partenaires
* Suivre l'activité du territoire
* Consulter les analytics

---

## Administrateur Paulo

Peut :

* Voir toutes les communes
* Voir tous les partenaires
* Valider les partenaires
* Gérer les demandes
* Superviser la plateforme

---

# Stack Technique

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Vercel

## Backend

* FastAPI
* Python
* Render

## Base de données

* PostgreSQL
* Neon

## IA

* OpenAI
* GPT-4o-mini
* GPT-4o-mini-transcribe

## Téléphonie

* Twilio Voice
* Twilio SMS
* Twilio WhatsApp

---

# Architecture Fonctionnelle

## Entrée demande

Canaux :

* Téléphone
* WhatsApp

Processus :

1. Réception du message
2. Transcription si audio
3. Classification IA
4. Détection catégorie
5. Détection sous-type
6. Création ou mise à jour client
7. Création demande
8. Distribution

---

# Catégories

## commerce

Sous-types :

* fleuriste
* boucher

## service_local

Sous-types :

* plombier
* electricien
* maçon
* pisciniste
* petits_travaux

## transport

Sous-types :

* taxi

## mairie

Sous-types :

* mairie

---

# Base de données

## clients

Informations :

* id
* phone
* first_name
* last_name
* address
* updated_at

Objectif :

Constituer un CRM habitants.

---

## partners

Informations :

* id
* name
* siret
* phone
* phone_type
* category
* subtype
* address
* is_active
* access_token

Objectif :

Réseau de partenaires locaux validés.

---

## requests

Informations :

* id
* phone
* transcription
* category
* subtype
* status
* client_id
* assigned_partner_id
* archived
* created_at
* handled_at

Objectif :

Suivi complet des demandes.

---

# Fonctionnalités existantes

## Téléphone

* Appel Twilio
* Enregistrement vocal
* Transcription IA

## WhatsApp

* Réception message
* Création automatique demande

## Classification IA

Détection :

* catégorie
* sous-type

## CRM Client

Création automatique :

* téléphone
* nom
* prénom
* adresse

si détectés dans le message.

## Dashboard Admin

* demandes
* partenaires
* clients

## Validation Partenaire

* activation
* désactivation

## Dashboard Partenaire

* accès via token
* consultation demandes

## Notifications

* SMS
* WhatsApp

uniquement pour les mobiles.

---

# Décisions Produit

## Décision 001

Paulo n'est pas une marketplace.

---

## Décision 002

Les partenaires doivent être validés manuellement.

---

## Décision 003

Une demande peut être assignée à un partenaire validé.

---

## Décision 004

Les habitants ne créent pas de compte.

Le numéro de téléphone sert d'identifiant principal.

---

# Roadmap Court Terme

## Priorité Haute

* Refonte UI admin
* Refonte UI mairie
* Refonte UI partenaire
* Dashboard analytics

## Priorité Moyenne

* Login partenaire
* Gestion multi-communes
* Historique client avancé

## Priorité Future

* Géolocalisation
* Heatmap demandes
* Multi-tenant complet
* Rapports automatiques mairie
* Rajouter plusieurs communes

---

# Vision Long Terme

Devenir la plateforme de référence de gestion des demandes locales pour :

* communes
* commerces
* artisans
* services locaux

Paulo doit permettre à une commune de centraliser l'ensemble des demandes de ses habitants depuis un seul outil.

Always read docs/PROJECT_CONTEXT.md before editing.
Paulo is not a marketplace.
Prioritize clean SaaS UX and stable TypeScript.
