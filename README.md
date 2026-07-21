# GlowUp 5.0.0 Beta

Second cerveau personnel — fusion des deux anciennes versions de GlowUp en une seule base cohérente :
Organisation, Productivité, Habitudes, Finances, Journal, Versets, Citations, Objectifs, Historique, Bilan.

Fonctionne **hors ligne** (cache local + PWA), se synchronise automatiquement avec **Supabase**, avec
**authentification par email/mot de passe**.

Stack : React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase + React Router + Recharts + PWA.

## Dernière passe (5.2.0-beta) — gestionnaire financier & planning avancé

- **Nouveau moteur financier** : comptes réels (espèces/banque/mobile money), transactions datées
  (revenu/dépense avec heure, catégorie, mode de paiement, note, origine), solde réel automatique.
- **Budget** : navigation mois par mois, chaque mois indépendant, onglets Catégories / Revenus & Dépenses /
  Comptes / Dettes / Fixes.
- **Achats** : confirmation d'achat (prix payé, date réelle, mode de paiement) → transaction automatique.
- **Épargne mensuelle** avec historique et graphique annuel.
- **Planning** : personnalisation complète d'une tâche quotidienne pour un seul jour (titre, heure, couleur,
  notes), suppression pour un jour précis sans toucher à la tâche d'origine.
- **Drag & Drop** dans l'emploi du temps.
- **Historique** : archiver / restaurer / supprimer.
- **Checklist** : accomplissements rétroactifs (date passée).
- **Dashboard** : citations/versets personnels + favoris + du jour mélangés sans doublon, solde réel affiché.
- **Versets** : traduction française affichable/masquable.
- **Bilan** : dépenses hebdomadaires réelles (transactions datées), évolution du solde réel et de l'épargne.

⚠️ **Important** : réexécute `supabase/schema.sql` dans ton projet Supabase — de nouvelles tables
(`transactions`, `finance_accounts`, `savings_monthly_targets`) et de nouvelles colonnes ont été ajoutées.
Rien n'est supprimé (`create table if not exists`), tes données existantes restent intactes.

---

## 1. Lancer le projet en local

```bash
npm install
cp .env.example .env
# remplis .env avec tes clés Supabase (étape 2 ci-dessous)
npm run dev
```

---

## 2. Créer et configurer ton projet Supabase

1. Va sur **[supabase.com](https://supabase.com)** → **New project**.
2. **Project Settings → API** : copie l'URL et la clé **anon/public** dans ton `.env`.
   > ⚠️ Utilise bien l'URL du projet (`https://xxxx.supabase.co`), pas l'URL `/rest/v1/`.
3. **SQL Editor** → colle tout le contenu de [`supabase/schema.sql`](./supabase/schema.sql) → **Run**.
   Cela crée toutes les tables (y compris les nouveaux modules v5 : historique, habitudes, journal,
   versets, dettes, flux fixes, qualités, plan d'action) avec RLS + Realtime.
4. **Authentication → Providers** : vérifie que **Email** est activé.
5. Relance `npm run dev`, crée un compte.

Si tu avais déjà une base Supabase de la v1, réexécute `schema.sql` : les nouvelles tables sont ajoutées
avec `create table if not exists`, aucune donnée existante n'est supprimée.

---

## 3. Déployer sur Vercel

```bash
git add -A && git commit -m "GlowUp 5.0.0 Beta"
git push -u origin main
```

Sur [vercel.com](https://vercel.com) : **New Project** → importe le repo → ajoute les variables
d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` → **Deploy**.

---

## 4. Ce qui est inclus dans cette version (Phase 1 — fusion + fondations)

- **Fusion des deux bases** : le meilleur de l'ancienne version (semaines d'habitudes, routines,
  dettes) et de la nouvelle (architecture Supabase, sync offline-first, design system).
- **ToDo Priorité** (renommée), **Planning** avec nouvelles tranches horaires (Matin/Après-midi/Soir/Nuit),
  ligne d'heure actuelle dans l'emploi du temps, report de tâche, micro-tâches quotidiennes, clic sur
  créneau libre pour créer une tâche.
- **Habitudes** : checklist hebdomadaire navigable (semaines passées consultables, confirmation avant
  modification rétroactive).
- **Checklist** : tâches diverses non prévues + vue des accomplissements du jour, synchronisée avec
  Planning et Habitudes.
- **Plan d'action** : tâches quotidiennes → micro-tâches → fréquences (par semaine/mois), non rétroactif.
- **Suggestions** : ce qu'il reste à faire selon les fréquences du Plan d'action et les habitudes du jour.
- **Historique global** : filtrable par module, date, recherche, tri.
- **Notes** + **Journal** (humeur, gratitude, bad moods & solutions, motivation du jour).
- **Versets** (génération quotidienne, favoris, ajout manuel) et **Citations** (même principe).
- **Budget** étendu : dettes (avec paiements partiels), revenus/dépenses fixes, revenus du jour.
- **Big Goals** et **Challenges** : décomposition en petites étapes avec barre de progression automatique.
- **Qualités** : bonnes/mauvaises qualités actuelles, qualités à acquérir ou perdues.
- **Divers** : page de regroupement des modules secondaires.
- **Réglages** : nom d'utilisateur, photo de profil, devise (MGA/EUR/USD) avec convertisseur d'aperçu,
  thème clair/sombre, export/import JSON complet, journal des versions.
- **PWA** : manifest + service worker (installable, fonctionne hors ligne), logo historique conservé.

## 5. Prochaines phases (non incluses ici, à faire sur demande)

- **IA** : suggestions de tâches, création automatique de routines/objectifs, résumé de journée.
- **Messagerie** entre utilisateurs (architecture à préparer : pseudo, conversations, notifications).
- **Actualités** (locales et mondiales).
- **Mode Concentration** (Pomodoro, timer, musique, statistiques de focus).
- **Export Excel** (.xlsx) des bilans, en plus de l'export JSON déjà disponible.
- **Drag-and-drop** dans le Planning.
- **Conversion réelle des montants existants** lors d'un changement de devise (actuellement : préférence
  enregistrée + convertisseur d'aperçu dans Réglages, sans réécriture rétroactive des montants stockés).
- **Application mobile native** (Android/iOS) via Capacitor, en s'appuyant sur la base PWA déjà posée.

## 6. Structure du projet

```
src/
  components/layout/   Sidebar (navigation groupée), TopBar, AppLayout, RequireAuth
  components/ui/       Button, Card, Modal, ProgressBar, SubTaskList, champs de formulaire
  context/
    AuthContext.tsx      Session Supabase, connexion / inscription / déconnexion
    GlowUpContext.tsx     CRUD générique local-first + profil (thème/devise/avatar) + historique + habitudes
  services/syncEngine.ts Cache local, file d'attente hors-ligne, pull/push/merge Supabase, Realtime
  lib/                  Client Supabase, utils, banques de versets/citations
  pages/                 Une page par module (23 pages)
  types/index.ts         Tous les modèles de données (+ mapping vers les tables Supabase)
supabase/schema.sql      Schéma complet (22 tables) à coller dans Supabase SQL Editor
public/                  manifest.json, sw.js, logo historique GlowUp
```
