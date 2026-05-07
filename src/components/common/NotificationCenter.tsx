import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDatabaseNotification,
  getDatabaseNotificationSignature,
  monitoredTables,
  subscribeToLocalDatabaseNotifications,
  tableLabels,
  type DatabaseNotificationEvent,
} from "../../lib/databaseNotifications";
import { getSupabaseClient, supabaseConfigError } from "../../lib/supabase";
import { Modal } from "./Modal";

interface DatabaseNotification {
  id: string;
  signature: string;
  event: DatabaseNotificationEvent;
  table: string;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
  dismissed: boolean;
}

const BATCH_WINDOW_MS = 1500;
const BATCH_THRESHOLD = 4;
const STORAGE_KEY = "visor_notifications";
const MAX_STORED = 200;

function loadStoredNotifications(): DatabaseNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as DatabaseNotification[]).map((n) => ({
      ...n,
      unread: false,
    }));
  } catch {
    return [];
  }
}

function saveNotifications(list: DatabaseNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {}
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<DatabaseNotification[]>(loadStoredNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const recentLocalSignaturesRef = useRef(new Map<string, number>());
  const pendingBatchRef = useRef<DatabaseNotification[]>([]);
  const batchTimerRef = useRef<number | null>(null);

  function flushBatch() {
    batchTimerRef.current = null;
    const batch = pendingBatchRef.current;
    pendingBatchRef.current = [];

    if (batch.length === 0) return;

    if (batch.length <= BATCH_THRESHOLD) {
      setNotifications((current) => [...batch, ...current]);
      return;
    }

    const tableCounts = batch.reduce<Record<string, number>>((acc, n) => {
      acc[n.table] = (acc[n.table] ?? 0) + 1;
      return acc;
    }, {});

    const tableLines = Object.entries(tableCounts)
      .map(([table, count]) => `${tableLabels[table as keyof typeof tableLabels] ?? table}: ${count}`)
      .join(" · ");

    const batchNotification: DatabaseNotification = {
      id: `batch:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      signature: `batch:${Date.now()}`,
      event: "INSERT",
      table: "batch",
      title: `${batch.length} registros ingresados`,
      message: tableLines,
      createdAt: new Date().toISOString(),
      unread: true,
      dismissed: false,
    };

    setNotifications((current) => [batchNotification, ...current]);
  }

  function addNotification(notification: DatabaseNotification) {
    pendingBatchRef.current.push(notification);

    if (batchTimerRef.current !== null) {
      window.clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = window.setTimeout(flushBatch, BATCH_WINDOW_MS);
  }

  function registerLocalSignature(signature: string) {
    const now = Date.now();
    recentLocalSignaturesRef.current.set(signature, now);
    for (const [sig, timestamp] of recentLocalSignaturesRef.current.entries()) {
      if (now - timestamp > 10000) {
        recentLocalSignaturesRef.current.delete(sig);
      }
    }
  }

  function shouldSkipRealtimeDuplicate(signature: string) {
    const timestamp = recentLocalSignaturesRef.current.get(signature);
    if (!timestamp) return false;
    return Date.now() - timestamp < 10000;
  }

  useEffect(() => {
    const unsubscribeLocal = subscribeToLocalDatabaseNotifications((payload) => {
      const notification = buildDatabaseNotification(payload) as DatabaseNotification;
      registerLocalSignature(notification.signature);
      addNotification(notification);
    });

    if (supabaseConfigError) {
      return unsubscribeLocal;
    }

    const supabase = getSupabaseClient();
    const channel = supabase.channel("database-notifications");

    for (const table of monitoredTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const signature = getDatabaseNotificationSignature({
            eventType: payload.eventType as DatabaseNotificationEvent,
            table,
            record: payload.new as Record<string, unknown>,
            oldRecord: payload.old as Record<string, unknown>,
          });

          if (shouldSkipRealtimeDuplicate(signature)) return;

          addNotification(
            buildDatabaseNotification({
              eventType: payload.eventType as DatabaseNotificationEvent,
              table,
              createdAt: payload.commit_timestamp,
              record: payload.new as Record<string, unknown>,
              oldRecord: payload.old as Record<string, unknown>,
            }) as DatabaseNotification,
          );
        },
      );
    }

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("No se pudo suscribir a las notificaciones de Supabase Realtime.");
      }
    });

    return () => {
      unsubscribeLocal();
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  function handleOpenCenter() {
    setIsOpen(true);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false })),
    );
  }

  function handleClearHistory() {
    setNotifications([]);
  }

  if (supabaseConfigError) {
    return null;
  }

  return (
    <>
      <button className="button button-secondary notifications-launcher" onClick={handleOpenCenter} type="button">
        Cambios
        {unreadCount > 0 ? <span className="notifications-count">{unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <Modal
          onClose={() => setIsOpen(false)}
          placement="top-right"
          size="compact"
          title="Cambios recientes"
        >
          <div className="notifications-panel">
            <div className="notes-toolbar">
              <p className="notes-meta">
                {notifications.length > 0
                  ? `${notifications.length} cambio(s) registrado(s)`
                  : "Todavia no hay cambios detectados."}
              </p>
              {notifications.length > 0 ? (
                <button className="button button-secondary button-small" onClick={handleClearHistory} type="button">
                  Limpiar historial
                </button>
              ) : null}
            </div>

            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <article className="notification-card" key={notification.id}>
                    <div className="notification-card-head">
                      <strong>{notification.title}</strong>
                      {notification.unread ? <span className="review-badge">Nuevo</span> : null}
                    </div>
                    <p>{notification.message}</p>
                    <small>
                      {new Date(notification.createdAt).toLocaleString("es-CL", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Espera aqui los proximos cambios de la base.</div>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
