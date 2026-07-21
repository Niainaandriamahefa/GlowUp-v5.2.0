import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
import { LogOut, RefreshCw, Database, Wifi, WifiOff, Download, Upload, Moon, Sun, Image as ImageIcon, Mail } from 'lucide-react';
import type { Currency } from '@/types';
import { CURRENCY_LABEL, formatAmount } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { computeScore, weekRangeFor } from '@/lib/bilan';
import { todayISO } from '@/lib/utils';

const CHANGELOG = [
  { version: '5.2.0-beta', date: '2026-07-20', notes: [
    'Nouveau moteur financier : comptes réels (espèces/banque/mobile money), transactions datées (revenu/dépense, heure, catégorie, mode de paiement, note, origine), solde réel calculé automatiquement.',
    'Budget : navigation mois par mois (chaque mois est indépendant), onglets Catégories / Revenus & Dépenses / Comptes / Dettes / Fixes.',
    'Achats : fenêtre de confirmation (prix réellement payé, date, mode de paiement, remarque) qui crée automatiquement une transaction.',
    'Épargne : objectifs mensuels avec historique et graphique annuel, en plus des objectifs nommés existants.',
    'Planning : personnalisation complète d\u2019une tâche quotidienne pour un seul jour (titre, heure, couleur, notes), suppression pour un jour précis sans toucher à la tâche d\u2019origine.',
    'Emploi du temps : Drag & Drop pour déplacer une tâche à une nouvelle heure (uniquement ce jour-là).',
    'Historique : archiver / restaurer / supprimer, en plus des filtres existants.',
    'Checklist : accomplissements rétroactifs (corriger un oubli sur une date passée).',
    'Dashboard : citations et versets personnels + favoris + du jour se mélangent en défilement, sans doublon.',
    'Versets : traduction française affichable/masquable.',
    'Bilan : dépenses désormais calculables par semaine (transactions datées), évolution du solde réel et de l\u2019épargne sur l\u2019année.',
  ]},
  { version: '5.0.1-beta', date: '2026-07-19', notes: [
    'Correction du bug de fuseau horaire (Planning : jour suivant/précédent).',
    'Correction de la double génération du verset/citation du jour.',
    'Correction de la synchro Planning ↔ Habitudes ↔ Dashboard pour les tâches quotidiennes.',
    'Nouvelle page Bilan : vues semaine/mois/année, Score GlowUp, graphiques, analyses.',
    'Personnalisation journalière des tâches quotidiennes.',
    'Menu latéral repliable, mode icônes, groupes dépliables.',
    'Devise appliquée automatiquement à toutes les pages financières.',
    'Historique : filtres jour/semaine/mois/période personnalisée + filtre Accomplissements.',
    'Checklist : ajout d\u2019accomplissement détaillé (tâche, description, modification).',
    'Qualités : détails (cause, conséquences, solutions, plan d\u2019amélioration).',
    'Plan d\u2019action : empêchements, motivations, éléments déclencheurs.',
    'Formulaires toujours entièrement visibles (correction du Modal).',
  ]},
  { version: '5.0.0-beta', date: '2026-07-18', notes: [
    'Fusion des deux versions GlowUp en une seule base.',
    "Historique global, Habitudes hebdomadaires, Journal, Versets, Suggestions, Qualités, Plan d'action.",
    'Budget : dettes, revenus/dépenses fixes.',
    'Planning : nouvelles tranches horaires, ligne d\u2019heure actuelle, report de tâche, micro-tâches.',
    'Réglages : devise, thème clair/sombre, export/import.',
  ]},
  { version: '1.0.0', date: '2026-07-18', notes: ['Première version : productivité, planning, budget, objectifs, synchronisation Supabase.'] },
];

export default function SettingsPage() {
  const { user, signOut, isConfigured } = useAuth();
  const { isOnline, isSyncing, lastSyncedAt, refreshFromCloud, data, profile, updateProfile, replaceAll } = useGlowUpData();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const [currencyDraft, setCurrencyDraft] = useState<Currency>(profile?.currency ?? 'MGA');
  const [currencySaved, setCurrencySaved] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile({ avatar_url: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function saveCurrency() {
    await updateProfile({ currency: currencyDraft });
    setCurrencySaved(true);
    setTimeout(() => setCurrencySaved(false), 2500);
  }

  async function saveEmail() {
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email });
    setEmailMsg(error ? error.message : 'Vérifie ta nouvelle adresse : un email de confirmation a été envoyé.');
  }

  const totalRecords = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  const currency = profile?.currency ?? 'MGA';
  const { from, to } = weekRangeFor(todayISO());
  const score = computeScore(data, from, to);

  function handleExport() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glowup-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = parsed.data ?? parsed;
      replaceAll(incoming);
      setImportMsg('Import réussi ! Tes données locales ont été remplacées.');
    } catch {
      setImportMsg("Le fichier n'a pas pu être lu. Vérifie qu'il s'agit bien d'un export GlowUp (.json).");
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Réglages</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Ton compte, tes préférences et ta synchronisation.</p>
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Profil</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Connecté en tant que</p>
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={saveEmail} disabled={email === user?.email}>
            <Mail size={14} /> Enregistrer
          </Button>
        </div>
        {emailMsg && <p className="mb-4 text-xs text-[var(--color-text-muted)]">{emailMsg}</p>}
        <div className="mb-4 flex items-center gap-4">
          <img
            src={profile?.avatar_url || '/avatar-default.png'}
            alt="Avatar"
            className="h-16 w-16 rounded-full border border-[var(--color-border)] object-cover"
          />
          <div>
            <Button variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()}>
              <ImageIcon size={14} /> Changer la photo
            </Button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="ml-auto text-center">
            <p className="font-display text-2xl font-bold text-[var(--color-violet-soft)]">{score.global}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Score GlowUp</p>
          </div>
        </div>
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <Label>Nom d'utilisateur</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ton nom" />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="secondary" onClick={() => { updateProfile({ full_name: fullName }); setNameSaved(true); setTimeout(() => setNameSaved(false), 2500); }}>
              Enregistrer
            </Button>
            {nameSaved && <span className="text-xs text-[var(--color-success)]">✓</span>}
          </div>
        </div>
        <Button variant="danger" onClick={signOut}>
          <LogOut size={15} /> Se déconnecter
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Apparence</h2>
        <div className="flex items-center gap-2">
          <Button variant={profile?.theme !== 'light' ? 'primary' : 'ghost'} size="sm" onClick={() => updateProfile({ theme: 'dark' })}>
            <Moon size={14} /> Sombre
          </Button>
          <Button variant={profile?.theme === 'light' ? 'primary' : 'ghost'} size="sm" onClick={() => updateProfile({ theme: 'light' })}>
            <Sun size={14} /> Clair
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Devise</h2>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Les montants sont stockés en Ariary (MGA) — devise par défaut — puis convertis automatiquement pour
          l'affichage dans toutes les pages financières (Budget, Achats, Épargne, Dashboard).
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={currencyDraft} onChange={(e) => setCurrencyDraft(e.target.value as Currency)} className="max-w-xs">
            {(Object.keys(CURRENCY_LABEL) as Currency[]).map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABEL[c]} ({c})
              </option>
            ))}
          </Select>
          <Button variant="primary" onClick={saveCurrency} disabled={currencyDraft === currency}>
            Enregistrer la devise
          </Button>
          {currencySaved && <span className="text-xs text-[var(--color-success)]">Devise mise à jour ✓</span>}
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Exemple : 100 000 MGA ≈ {formatAmount(100000, currencyDraft)}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Synchronisation</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Supabase configuré</span>
            <span className="flex items-center gap-1">
              <Database size={14} className={isConfigured ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'} />
              {isConfigured ? 'Oui' : 'Non — voir README.md'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">État réseau</span>
            <span className="flex items-center gap-1">
              {isOnline ? <Wifi size={14} className="text-[var(--color-success)]" /> : <WifiOff size={14} className="text-[var(--color-warning)]" />}
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Dernière synchro</span>
            <span>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString('fr-FR') : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">Éléments enregistrés</span>
            <span className="font-mono">{totalRecords}</span>
          </div>
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => refreshFromCloud()} disabled={isSyncing || !isConfigured}>
          <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} /> Forcer la synchronisation
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Export / Import</h2>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Exporte toutes tes données au format JSON (sauvegarde complète), ou importe un export précédent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={15} /> Exporter (.json)
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            <Upload size={15} /> Importer (.json)
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        </div>
        {importMsg && <p className="mt-2 text-xs text-[var(--color-text-muted)]">{importMsg}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Version & mises à jour</h2>
        <div className="space-y-4">
          {CHANGELOG.map((c) => (
            <div key={c.version}>
              <p className="text-sm font-medium">
                v{c.version} <span className="font-normal text-[var(--color-text-faint)]">— {c.date}</span>
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-[var(--color-text-muted)]">
                {c.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
