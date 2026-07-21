import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { PaymentMethod, PurchaseItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Label, Badge, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { todayISO } from '@/lib/utils';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte',
  mobile_money: 'Mobile Money',
  transfer: 'Virement',
  other: 'Autre',
};

export default function ShoppingPage() {
  const { data, add, update, remove, recordTransaction } = useGlowUpData();
  const { format } = useCurrencyFormatter();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Général');
  const [price, setPrice] = useState<number | ''>('');

  // --- Confirmation d'achat ---
  const [confirmTarget, setConfirmTarget] = useState<PurchaseItem | null>(null);
  const [paidPrice, setPaidPrice] = useState<number>(0);
  const [paidAt, setPaidAt] = useState(todayISO());
  const [purchaseNote, setPurchaseNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const visible = useMemo(
    () => data.purchaseItems.filter((p) => p.is_archived === showArchived),
    [data.purchaseItems, showArchived]
  );
  const total = visible.filter((p) => !p.is_bought).reduce((s, p) => s + (p.price ?? 0), 0);

  function handleSave() {
    if (!name.trim()) return;
    add('purchaseItems', {
      name: name.trim(),
      category,
      price: price === '' ? null : Number(price),
      is_bought: false,
      is_archived: false,
      paid_price: null,
      paid_at: null,
      payment_method: null,
      purchase_note: null,
    });
    setName('');
    setPrice('');
    setModalOpen(false);
  }

  function openConfirm(item: PurchaseItem) {
    setConfirmTarget(item);
    setPaidPrice(item.price ?? 0);
    setPaidAt(todayISO());
    setPurchaseNote('');
    setPaymentMethod('cash');
  }

  function confirmPurchase() {
    if (!confirmTarget) return;
    update('purchaseItems', confirmTarget.id, {
      is_bought: true,
      paid_price: paidPrice,
      paid_at: paidAt,
      payment_method: paymentMethod,
      purchase_note: purchaseNote.trim() || null,
    });
    recordTransaction({
      type: 'expense',
      amount: paidPrice,
      date: paidAt,
      time: new Date().toTimeString().slice(0, 5),
      category,
      note: purchaseNote.trim() || null,
      payment_method: paymentMethod,
      account_id: null,
      origin: 'Achat',
      linked_purchase_id: confirmTarget.id,
    });
    setConfirmTarget(null);
  }

  function uncheckPurchase(item: PurchaseItem) {
    update('purchaseItems', item.id, { is_bought: false });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Liste d'achats</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Reste à acheter : {format(total)}</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Article
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={!showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(false)}>
          Actifs
        </Button>
        <Button variant={showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(true)}>
          Archivés
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Liste vide.</Card>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <Card key={item.id} className="flex items-center gap-3 p-4">
              <Checkbox checked={item.is_bought} onChange={(v) => (v ? openConfirm(item) : uncheckPurchase(item))} />
              <div className="min-w-0 flex-1">
                <p className={item.is_bought ? 'line-through text-[var(--color-text-faint)]' : ''}>{item.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{item.category}</Badge>
                  {item.price !== null && <Badge color="var(--color-text-faint)">Prévu : {format(item.price)}</Badge>}
                  {item.is_bought && item.paid_price !== null && (
                    <Badge color="var(--color-success)">Payé : {format(item.paid_price)} le {item.paid_at}</Badge>
                  )}
                </div>
                {item.purchase_note && <p className="mt-1 text-xs text-[var(--color-text-faint)]">{item.purchase_note}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => update('purchaseItems', item.id, { is_archived: !item.is_archived })}>
                  <Archive size={15} />
                </Button>
                <Button variant="danger" size="icon" onClick={() => remove('purchaseItems', item.id)}>
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel article">
        <div className="space-y-3">
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Prix prévu</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirmer l'achat">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            « {confirmTarget?.name} » — confirme les détails réels de l'achat. Une transaction sera créée
            automatiquement dans le budget.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prix réellement payé</Label>
              <Input type="number" value={paidPrice} onChange={(e) => setPaidPrice(Number(e.target.value))} autoFocus />
            </div>
            <div>
              <Label>Date réelle d'achat</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Mode de paiement</Label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Remarque</Label>
            <Textarea rows={2} value={purchaseNote} onChange={(e) => setPurchaseNote(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={confirmPurchase}>
            Valider l'achat
          </Button>
        </div>
      </Modal>
    </div>
  );
}
