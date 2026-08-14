import { TableCell } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import InlineEditableCell from './InlineEditableCell';
import { Lead, ColumnKey, formatDate, formatBonus } from './adminTypes';

type AdminLeadIdentityCellsProps = {
  lead: Lead;
  savingId: number | null;
  isColumnVisible: (key: ColumnKey) => boolean;
  saveLeadField: (id: number, field: string, value: string) => Promise<void>;
  resetGaragePassword: (id: number) => void;
  toggleGarageBlock: (id: number) => void;
  onShowLoginHistory: (phone: string, name: string) => void;
};

const AdminLeadIdentityCells = ({
  lead: l,
  savingId,
  isColumnVisible,
  saveLeadField,
  resetGaragePassword,
  toggleGarageBlock,
  onShowLoginHistory,
}: AdminLeadIdentityCellsProps) => {
  return (
    <>
      {isColumnVisible('number') && (
        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
          {l.id}
        </TableCell>
      )}
      {isColumnVisible('date') && (
        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
          {formatDate(l.created_at)}
        </TableCell>
      )}
      {isColumnVisible('vin') && (
        <TableCell className="font-head tracking-[0.1em]">
          <InlineEditableCell
            value={l.vin || ''}
            displayLabel="VIN"
            onSave={(v) => saveLeadField(l.id, 'vin', v)}
            inputClassName="w-40"
          />
        </TableCell>
      )}
      {isColumnVisible('car') && (
        <TableCell className="text-muted-foreground">
          <InlineEditableCell
            value={l.car_name || ''}
            displayLabel="Авто"
            onSave={(v) => saveLeadField(l.id, 'car_name', v)}
            inputClassName="w-32"
          />
        </TableCell>
      )}
      {isColumnVisible('name') && (
        <TableCell>
          <div className="flex items-center gap-1.5">
            <InlineEditableCell
              value={l.name}
              displayLabel="Имя"
              required
              onSave={(v) => saveLeadField(l.id, 'name', v)}
              inputClassName="w-32"
            />
            <button
              title="История входов в «Гараж»"
              onClick={() => onShowLoginHistory(l.phone, l.name)}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            >
              <Icon name="History" size={13} />
            </button>
            {l.invited_by_name && (
              <span
                title={`Приглашён клиентом: ${l.invited_by_name} (${l.invited_by_phone})`}
                className="shrink-0 inline-flex"
              >
                <Icon name="Gift" size={13} className="text-primary" />
              </span>
            )}
            {l.friends_invited_count > 0 && (
              <span
                title={`Пригласил друзей: ${l.friends_invited_count}. Заработано на рефералах: ${formatBonus(l.referral_bonus_earned)}`}
                className="shrink-0 inline-flex items-center gap-0.5 text-xs text-muted-foreground"
              >
                <Icon name="Users" size={13} className="text-primary" />
                {l.friends_invited_count}
              </span>
            )}
          </div>
        </TableCell>
      )}
      {isColumnVisible('phone') && (
        <TableCell>
          <div className="flex items-center gap-1.5">
            <InlineEditableCell
              value={l.phone}
              displayLabel="Телефон"
              required
              onSave={(v) => saveLeadField(l.id, 'phone', v)}
              inputClassName="w-32"
              renderValue={(v) => (
                <a
                  href={`tel:${v}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary whitespace-nowrap"
                >
                  {v}
                </a>
              )}
            />
            <span
              title={l.phone_verified ? 'Номер подтверждён звонком' : 'Номер не подтверждён звонком'}
              className="shrink-0 inline-flex"
            >
              <Icon
                name={l.phone_verified ? 'ShieldCheck' : 'ShieldQuestion'}
                size={13}
                className={l.phone_verified ? 'text-green-600' : 'text-muted-foreground'}
              />
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  title="Сбросить пароль от «Гаража» для этого клиента"
                  disabled={savingId === l.id}
                  className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                >
                  <Icon name="KeyRound" size={13} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Сбросить пароль клиента?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Клиент {l.name} ({l.phone}) сможет войти в «Гараж» по одному телефону,
                    без пароля, и при желании задать новый.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetGaragePassword(l.id)}>
                    Сбросить пароль
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {l.garage_blocked ? (
              <button
                title="Разблокировать доступ в «Гараж»"
                disabled={savingId === l.id}
                onClick={() => toggleGarageBlock(l.id)}
                className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-destructive hover:text-primary hover:bg-muted transition-colors"
              >
                <Icon name="Lock" size={13} />
              </button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    title="Заблокировать доступ в «Гараж»"
                    disabled={savingId === l.id}
                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  >
                    <Icon name="LockOpen" size={13} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Заблокировать клиента в «Гараже»?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Клиент {l.name} ({l.phone}) временно не сможет войти в личный кабинет
                      «Гараж» по этому номеру телефона. Разблокировать можно в любой момент.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toggleGarageBlock(l.id)}>
                      Заблокировать
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </TableCell>
      )}
      {isColumnVisible('city') && (
        <TableCell className="text-muted-foreground">
          <InlineEditableCell
            value={l.city || ''}
            displayLabel="Город"
            onSave={(v) => saveLeadField(l.id, 'city', v)}
            inputClassName="w-28"
          />
        </TableCell>
      )}
      {isColumnVisible('mileage') && (
        <TableCell>
          <InlineEditableCell
            value={l.mileage != null ? String(l.mileage) : ''}
            displayLabel="Пробег"
            onSave={(v) => saveLeadField(l.id, 'mileage', v.replace(/\D/g, ''))}
            inputClassName="w-24"
            renderValue={(v) => (
              <span className="inline-flex items-center gap-1 text-primary font-medium tabular-nums">
                <Icon name="Gauge" size={12} />
                {Number(v).toLocaleString('ru-RU')} км
              </span>
            )}
          />
        </TableCell>
      )}
    </>
  );
};

export default AdminLeadIdentityCells;
