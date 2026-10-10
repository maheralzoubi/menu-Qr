import { orderTypeOf, shortId, type Order, type OrderType } from '../../contexts/AppContext';

type TM = (k: string, o?: Record<string, unknown>) => string;

export const STATUS_INDEX: Record<Order['status'], number> = { Pending: 0, Preparing: 1, Ready: 2, Delivered: 3, Cancelled: -1 };

export function statusShort(status: Order['status'], tm: TM) {
  return {
    Pending: tm('stPending'), Preparing: tm('stPreparing'), Ready: tm('stReady'), Delivered: tm('stDone'), Cancelled: tm('stCancelled'),
  }[status] ?? status;
}

/** Tracking step titles/descriptions; step 3 depends on the order type. */
export function stepDefs(type: OrderType, tm: TM): [string, string][] {
  return [[tm('s0'), tm('s0d')], [tm('s1'), tm('s1d')], [tm(`s2${type}`), tm('s2d')], [tm('s3'), tm('s3d')]];
}

export function stepLabelFor(status: Order['status'], type: OrderType, tm: TM) {
  const i = STATUS_INDEX[status];
  return i < 0 ? tm('stCancelled') : stepDefs(type, tm)[i][0];
}

export function describeOrder(o: Order, tm: TM) {
  const type = orderTypeOf(o);
  const idx = STATUS_INDEX[o.status];
  return {
    id: '#' + shortId(o._id),
    type,
    typeLabel: tm(type),
    summary: o.items.map(l => `${l.quantity}× ${l.name}`).join(', '),
    date: new Date(o.createdAt).toLocaleDateString(),
    status: statusShort(o.status, tm),
    ready: o.status === 'Ready',
    done: o.status === 'Delivered',
    cancelled: o.status === 'Cancelled',
    steps: [0, 1, 2, 3].map(i => i <= idx),
  };
}
