"use client";

import { X, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  symbol: string;
  qty: number;
  filledQty: number;
  side: "buy" | "sell";
  type: string;
  status: string;
  limitPrice: number | null;
  filledAvgPrice: number | null;
  createdAt: string;
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onCancel: (orderId: string) => void;
}

export default function OrdersTable({ orders, loading, onCancel }: OrdersTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filled":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "canceled":
      case "expired":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending_new":
      case "accepted":
      case "new":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold">Orders</h3>
        </div>
        <div className="p-8 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[var(--bg-tertiary)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
      <div className="p-4 border-b border-[var(--border-color)]">
        <h3 className="font-semibold">Recent Orders</h3>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <p>No orders</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[var(--bg-secondary)]">
              <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Symbol</th>
                <th className="text-center p-3 font-medium">Side</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Price</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="p-3 text-xs text-[var(--text-secondary)]">
                    {formatTime(order.createdAt)}
                  </td>
                  <td className="p-3 font-medium">{order.symbol}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        order.side === "buy"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {order.filledQty}/{order.qty}
                  </td>
                  <td className="p-3 text-xs uppercase text-[var(--text-secondary)]">
                    {order.type}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {order.filledAvgPrice
                      ? formatCurrency(order.filledAvgPrice)
                      : order.limitPrice
                      ? formatCurrency(order.limitPrice)
                      : "-"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      {getStatusIcon(order.status)}
                      <span className="text-xs capitalize">{order.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {["new", "accepted", "pending_new"].includes(order.status) && (
                      <button
                        onClick={() => onCancel(order.id)}
                        className="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Cancel order"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
