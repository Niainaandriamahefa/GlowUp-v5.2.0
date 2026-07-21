import { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { IncomeType, FixedFlowType, TransactionType, PaymentMethod, AccountType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input, Label, Select, Badge, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { todayISO, startOfWeekISO } from '@/lib/utils';

const COLORS = ['#8B5CF6', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#F472B6'];
type Tab = 'apercu' | 'transactions' | 'comptes' | 'dettes' | 'fixes';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte',
  mobile_money: 'Mobile Money',
  transfer: 'Virement',
  other: 'Autre',
};

const ACCOUNT_LABEL: Record<AccountType, string> = {
  cash: 'Espèces',
  bank: 'Compte bancaire',
  mobile_money: 'Mobile Money',
  other: 'Autre',
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetPage() {
  const { data, add, remove, update, recordTransaction } = useGlowUpData();
  const { format } = useCurrencyFormatter();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [tab, setTab] = useState<Tab>('apercu');

  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [planned, setPlanned] = useState(0);
  const [spent, setSpent] = useState(0);

  const [txModal, setTxModal] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState(0);
  const [txDate, setTxDate] = useState(todayISO());
  const [txTime, setTxTime] = useState(new Date().toTimeString().slice(0, 5));
  const [txCategory, setTxCategory] = useState('Général');
  const [txNote, setTxNote] = useState('');
  const [txPayment, setTxPayment] = useState<PaymentMethod>('cash');
  const [txAccount, setTxAccount] = useState<string>('');
  const [txOrigin, setTxOrigin] = useState('');

  const [txFilterType, setTxFilterType] = useState<'all' | TransactionType>('all');
  const [txFilterCategory, setTxFilterCategory] = useState('all');

  const [debtModal, setDebtModal] = useState(false);
  const [debtPerson, setDebtPerson] = useState('');
  const [debtReason, setDebtReason] = useState('');
  const [debtAmount, setDebtAmount] = useState(0);
  const [debtDue, setDebtDue] = useState('');

  const [fixedModal, setFixedModal] = useState(false);
  const [fixedLabel, setFixedLabel] = useState('');
  const [fixedAmount, setFixedAmount] = useState(0);
  const [fixedType, setFixedType] = useState<FixedFlowType>('expense');
  const [fixedDay, setFixedDay] = useState(1);

  const [accountModal, setAccountModal] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('cash');
  const [accountInitial, setAccountInitial] = useState(0);

  const categories = useMemo(() => data.budgetCategories.filter((b) => b.month === month), [data.budgetCategories, month]);
  const monthTransactions = useMemo(() => data.transactions.filter((t) => t.date.slice(0, 7) === month), [data.transactions, month]);
  const debts = useMemo(() => data.debts.filter((d) => !d.is_archived), [data.debts]);
  const fixedFlows = data.fixedFlows;
  const accounts = useMemo(() => data.financeAccounts.filter((a) => !a.is_archived), [data.financeAccounts]);

  const totalPlanned = categories.reduce((s, c) => s + c.planned_amount, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent_amount, 0);
  const monthIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const fixedIncome = fixedFlows.filter((f) => f.flow_type === 'income').reduce((s, f) => s + f.amount, 0);
  const fixedExpense = fixedFlows.filter((f) => f.flow_type === 'expense').reduce((s, f) => s + f.amount, 0);
  const totalDebtRemaining = debts.filter((d) => !d.is_settled).reduce((s, d) => s + (d.amount - d.paid_amount), 0);

  // Solde réel = somme des soldes initiaux des comptes + tout l'historique des transactions (toutes dates)
  const realBalance = useMemo(() => {
    const initial = accounts.reduce((s, a) => s + a.initial_amount, 0);
    const delta = data.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    return initial + delta;
  }, [accounts, data.transactions]);

  function accountBalance(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return 0;
    const delta = data.transactions
      .filter((t) => t.account_id === accountId)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    return account.initial_amount + delta;
  }

  const [txPeriod, setTxPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const txCategories = useMemo(() => Array.from(new Set(data.transactions.map((t) => t.category))).sort(), [data.transactions]);
  const periodScopedTransactions = useMemo(() => {
    if (txPeriod === 'year') return data.transactions.filter((t) => t.date.slice(0, 4) === month.slice(0, 4));
    if (txPeriod === 'month') return monthTransactions;
    const today = todayISO();
    if (txPeriod === 'day') return data.transactions.filter((t) => t.date === today);
    const weekStart = startOfWeekISO(today);
    return data.transactions.filter((t) => t.date >= weekStart);
  }, [data.transactions, monthTransactions, txPeriod, month]);

  const filteredTransactions = useMemo(() => {
    return periodScopedTransactions
      .filter((t) => txFilterType === 'all' || t.type === txFilterType)
      .filter((t) => txFilterCategory === 'all' || t.category === txFilterCategory)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [periodScopedTransactions, txFilterType, txFilterCategory]);

  function saveCategory() {
    if (!catName.trim()) return;
    add('budgetCategories', { name: catName.trim(), planned_amount: planned, spent_amount: spent, month, color: COLORS[categories.length % COLORS.length] });
    setCatName(''); setPlanned(0); setSpent(0); setCatModal(false);
  }

  function openTxModal(type: TransactionType) {
    setTxType(type);
    setTxAmount(0);
    setTxDate(todayISO());
    setTxTime(new Date().toTimeString().slice(0, 5));
    setTxCategory('Général');
    setTxNote('');
    setTxPayment('cash');
    setTxAccount(accounts[0]?.id ?? '');
    setTxOrigin('');
    setTxModal(true);
  }

  function saveTransaction() {
    if (txAmount <= 0) return;
    recordTransaction({
      type: txType,
      amount: txAmount,
      date: txDate,
      time: txTime,
      category: txCategory.trim() || 'Général',
      note: txNote.trim() || null,
      payment_method: txPayment,
      account_id: txAccount || null,
      origin: txOrigin.trim() || null,
      linked_purchase_id: null,
    });
    setTxModal(false);
  }

  function saveDebt() {
    if (!debtPerson.trim()) return;
    add('debts', { person: debtPerson.trim(), reason: debtReason.trim() || null, amount: debtAmount, paid_amount: 0, loan_date: todayISO(), due_date: debtDue || null, is_settled: false, is_archived: false });
    setDebtPerson(''); setDebtReason(''); setDebtAmount(0); setDebtDue(''); setDebtModal(false);
  }

  function payDebt(id: string, amount: number, current: number, total: number) {
    const paid = Math.min(total, current + amount);
    const settled = paid >= total;
    update('debts', id, { paid_amount: paid, is_settled: settled });
  }

  function saveFixed() {
    if (!fixedLabel.trim()) return;
    add('fixedFlows', { label: fixedLabel.trim(), amount: fixedAmount, flow_type: fixedType, day_of_month: fixedDay });
    setFixedLabel(''); setFixedAmount(0); setFixedModal(false);
  }

  function saveAccount() {
    if (!accountName.trim()) return;
    add('financeAccounts', { name: accountName.trim(), type: accountType, initial_amount: accountInitial, is_archived: false });
    setAccountName(''); setAccountInitial(0); setAccountModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Budget</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Chaque mois a son propre budget, indépendant des autres.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-lg font-semibold text-[var(--color-success)]">{format(monthIncome + fixedIncome)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Revenus du mois</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-semibold text-[var(--color-danger)]">{format(monthExpense + fixedExpense)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Dépenses du mois</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-semibold">{format(monthIncome + fixedIncome - monthExpense - fixedExpense)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Solde du mois</p>
        </Card>
        <Card className="text-center">
          <p className="text-lg font-semibold text-[var(--color-violet-soft)]">{format(realBalance)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Solde réel disponible</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['apercu', 'transactions', 'comptes', 'dettes', 'fixes'] as Tab[]).map((t) => (
          <Button key={t} variant={tab === t ? 'primary' : 'ghost'} size="sm" onClick={() => setTab(t)}>
            {t === 'apercu' ? 'Catégories' : t === 'transactions' ? 'Revenus & Dépenses' : t === 'comptes' ? 'Comptes' : t === 'dettes' ? 'Dettes' : 'Fixes'}
          </Button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Catégories de budget — {month}</h2>
            <Button variant="primary" size="sm" onClick={() => setCatModal(true)}>
              <Plus size={14} /> Catégorie
            </Button>
          </div>
          {categories.length === 0 ? (
            <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucune catégorie ce mois-ci.</Card>
          ) : (
            categories.map((c) => {
              const pct = c.planned_amount > 0 ? (c.spent_amount / c.planned_amount) * 100 : 0;
              return (
                <Card key={c.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {format(c.spent_amount)} / {format(c.planned_amount)}
                      </span>
                      <Button variant="danger" size="icon" onClick={() => remove('budgetCategories', c.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <ProgressBar value={pct} color={pct > 100 ? 'var(--color-danger)' : c.color} />
                </Card>
              );
            })
          )}
          <p className="text-xs text-[var(--color-text-faint)]">
            Prévu {format(totalPlanned)} · Dépensé (suivi manuel) {format(totalSpent)}. Le détail précis et daté de
            chaque revenu/dépense se trouve dans l'onglet « Revenus & Dépenses ».
          </p>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Revenus & dépenses du mois</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openTxModal('income')}>
                <Plus size={14} /> Revenu du jour
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openTxModal('expense')}>
                <Plus size={14} /> Dépense du jour
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['day', "Aujourd'hui"],
              ['week', 'Semaine'],
              ['month', 'Mois'],
              ['year', 'Année'],
            ] as ['day' | 'week' | 'month' | 'year', string][]).map(([key, label]) => (
              <Button key={key} variant={txPeriod === key ? 'primary' : 'ghost'} size="sm" onClick={() => setTxPeriod(key)}>
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={txFilterType} onChange={(e) => setTxFilterType(e.target.value as any)} className="max-w-[160px]">
              <option value="all">Tous types</option>
              <option value="income">Revenus</option>
              <option value="expense">Dépenses</option>
            </Select>
            <Select value={txFilterCategory} onChange={(e) => setTxFilterCategory(e.target.value)} className="max-w-[180px]">
              <option value="all">Toutes catégories</option>
              {txCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          {filteredTransactions.length === 0 ? (
            <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucune transaction ce mois-ci.</Card>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <Card key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t.category} {t.origin && <span className="text-[var(--color-text-faint)]">· {t.origin}</span>}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {t.date} à {t.time} · {PAYMENT_LABEL[t.payment_method]}
                    </p>
                    {t.note && <p className="text-xs text-[var(--color-text-faint)]">{t.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm ${t.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {t.type === 'income' ? '+' : '-'}
                      {format(t.amount)}
                    </span>
                    <Button variant="danger" size="icon" onClick={() => remove('transactions', t.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'comptes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Comptes — solde réel disponible</h2>
            <Button variant="primary" size="sm" onClick={() => setAccountModal(true)}>
              <Plus size={14} /> Compte
            </Button>
          </div>
          {accounts.length === 0 ? (
            <Card className="text-center text-sm text-[var(--color-text-faint)]">
              Ajoute tes comptes (espèces, banque, mobile money…) pour suivre ton solde réel.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((a) => (
                <Card key={a.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <Badge color="var(--color-text-faint)">{ACCOUNT_LABEL[a.type]}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg">{format(accountBalance(a.id))}</p>
                    <button onClick={() => update('financeAccounts', a.id, { is_archived: true })} className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                      Archiver
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'dettes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Dettes — intégrées à l'objectif financier</h2>
            <Button variant="primary" size="sm" onClick={() => setDebtModal(true)}>
              <Plus size={14} /> Dette
            </Button>
          </div>
          {debts.length === 0 ? (
            <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucune dette enregistrée.</Card>
          ) : (
            debts.map((d) => {
              const remaining = d.amount - d.paid_amount;
              const pct = d.amount > 0 ? (d.paid_amount / d.amount) * 100 : 0;
              return (
                <Card key={d.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{d.person}</p>
                      {d.reason && <p className="text-xs text-[var(--color-text-muted)]">{d.reason}</p>}
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge color="var(--color-text-faint)">Emprunté le {d.loan_date}</Badge>
                        {d.due_date && <Badge color="var(--color-warning)">Échéance {d.due_date}</Badge>}
                        {d.is_settled && <Badge color="var(--color-success)">Soldée</Badge>}
                      </div>
                    </div>
                    <Button variant="danger" size="icon" onClick={() => remove('debts', d.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <ProgressBar value={pct} color="var(--color-success)" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono">
                      {format(d.paid_amount)} / {format(d.amount)} — reste {format(remaining)}
                    </span>
                    {!d.is_settled && <PayDebtForm onPay={(amount) => payDebt(d.id, amount, d.paid_amount, d.amount)} />}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === 'fixes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Revenus & dépenses fixes</h2>
            <Button variant="primary" size="sm" onClick={() => setFixedModal(true)}>
              <Plus size={14} /> Ajouter
            </Button>
          </div>
          {fixedFlows.length === 0 ? (
            <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun flux fixe (loyer, salaire mensuel…).</Card>
          ) : (
            fixedFlows.map((f) => (
              <Card key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {f.flow_type === 'income' ? 'Revenu fixe' : 'Dépense fixe'}
                    {f.day_of_month ? ` · le ${f.day_of_month} du mois` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm ${f.flow_type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {format(f.amount)}
                  </span>
                  <Button variant="danger" size="icon" onClick={() => remove('fixedFlows', f.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nouvelle catégorie">
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} autoFocus placeholder="Loyer, Courses…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Budget prévu</Label><Input type="number" value={planned} onChange={(e) => setPlanned(Number(e.target.value))} /></div>
            <div><Label>Déjà dépensé</Label><Input type="number" value={spent} onChange={(e) => setSpent(Number(e.target.value))} /></div>
          </div>
          <Button variant="primary" className="w-full" onClick={saveCategory}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal open={txModal} onClose={() => setTxModal(false)} title={txType === 'income' ? 'Nouveau revenu' : 'Nouvelle dépense'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Montant</Label><Input type="number" value={txAmount} onChange={(e) => setTxAmount(Number(e.target.value))} autoFocus /></div>
            <div><Label>Catégorie</Label><Input value={txCategory} onChange={(e) => setTxCategory(e.target.value)} list="budget-categories" />
              <datalist id="budget-categories">
                {categories.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} /></div>
            <div><Label>Heure</Label><Input type="time" value={txTime} onChange={(e) => setTxTime(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mode de paiement</Label>
              <Select value={txPayment} onChange={(e) => setTxPayment(e.target.value as PaymentMethod)}>
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Compte</Label>
              <Select value={txAccount} onChange={(e) => setTxAccount(e.target.value)}>
                <option value="">Aucun</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div><Label>Origine (ex : Salaire, Prime…)</Label><Input value={txOrigin} onChange={(e) => setTxOrigin(e.target.value)} /></div>
          <div><Label>Note</Label><Textarea rows={2} value={txNote} onChange={(e) => setTxNote(e.target.value)} /></div>
          <Button variant="primary" className="w-full" onClick={saveTransaction}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal open={debtModal} onClose={() => setDebtModal(false)} title="Nouvelle dette">
        <div className="space-y-3">
          <div><Label>Personne</Label><Input value={debtPerson} onChange={(e) => setDebtPerson(e.target.value)} autoFocus /></div>
          <div><Label>Motif</Label><Input value={debtReason} onChange={(e) => setDebtReason(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Montant</Label><Input type="number" value={debtAmount} onChange={(e) => setDebtAmount(Number(e.target.value))} /></div>
            <div><Label>Échéance</Label><Input type="date" value={debtDue} onChange={(e) => setDebtDue(e.target.value)} /></div>
          </div>
          <Button variant="primary" className="w-full" onClick={saveDebt}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal open={fixedModal} onClose={() => setFixedModal(false)} title="Nouveau flux fixe">
        <div className="space-y-3">
          <div><Label>Libellé</Label><Input value={fixedLabel} onChange={(e) => setFixedLabel(e.target.value)} autoFocus placeholder="Loyer, Salaire…" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Montant</Label><Input type="number" value={fixedAmount} onChange={(e) => setFixedAmount(Number(e.target.value))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={fixedType} onChange={(e) => setFixedType(e.target.value as FixedFlowType)}>
                <option value="expense">Dépense</option>
                <option value="income">Revenu</option>
              </Select>
            </div>
            <div><Label>Jour du mois</Label><Input type="number" min={1} max={31} value={fixedDay} onChange={(e) => setFixedDay(Number(e.target.value))} /></div>
          </div>
          <Button variant="primary" className="w-full" onClick={saveFixed}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal open={accountModal} onClose={() => setAccountModal(false)} title="Nouveau compte">
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} autoFocus placeholder="Ex : Espèces, BOA, Orange Money…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
                {(Object.keys(ACCOUNT_LABEL) as AccountType[]).map((t) => (
                  <option key={t} value={t}>{ACCOUNT_LABEL[t]}</option>
                ))}
              </Select>
            </div>
            <div><Label>Solde initial</Label><Input type="number" value={accountInitial} onChange={(e) => setAccountInitial(Number(e.target.value))} /></div>
          </div>
          <Button variant="primary" className="w-full" onClick={saveAccount}>Enregistrer</Button>
        </div>
      </Modal>
    </div>
  );
}

function PayDebtForm({ onPay }: { onPay: (amount: number) => void }) {
  const [amount, setAmount] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-24" placeholder="Montant" />
      <Button variant="secondary" size="sm" onClick={() => { if (amount > 0) { onPay(amount); setAmount(0); } }}>
        <CheckCircle2 size={13} /> Payer
      </Button>
    </div>
  );
}
