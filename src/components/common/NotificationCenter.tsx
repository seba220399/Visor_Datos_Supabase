import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDatabaseNotification,
  getDatabaseNotificationSignature,
  monitoredTables,
  subscribeToLocalDatabaseNotifications,
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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const recentLocalSignaturesRef = useRef(new Map<string, number>());

  function registerLocalSignature(signature: string) {
    const now = Date.now();

    recentLocalSignaturesRef.current.set(signature, now);

    for (const [currentSignature, timestamp] of recentLocalSignaturesRef.current.entries()) {
      if (now - timestamp > 10000) {
        recentLocalSignaturesRef.current.delete(currentSignature);
      }
    }
  }

  function shouldSkipRealtimeDuplicate(signature: string) {
    const timestamp = recentLocalSignaturesRef.current.get(signature);

    if (!timestamp) {
      return false;
    }

    return Date.now() - timestamp < 10000;
  }

  useEffect(() => {
    const unsubscribeLocal = subscribeToLocalDatabaseNotifications((payload) => {
      const notification = buildDatabaseNotification(payload) as DatabaseNotification;
      registerLocalSignature(notification.signature);
      setNotifications((current) => [notification, ...current]);
    });

    if (supabaseConfigError) {
      return unsubscribeLocal;
    }

    const supabase = getSupabaseClient();
    const channel = supabase.channel("database-notifications");

    for (const table of monitoredTables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          const signature = getDatabaseNotificationSignature({
            eventType: payload.eventType as DatabaseNotificationEvent,
            table,
            record: payload.new as Record<string, unknown>,
            oldRecord: payload.old as Record<string, unknown>,
          });

          if (shouldSkipRealtimeDuplicate(signature)) {
            return;
          }

          setNotifications((current) => [
            buildDatabaseNotification({
              eventType: payload.eventType as DatabaseNotificationEvent,
              table,
              createdAt: payload.commit_timestamp,
              record: payload.new as Record<string, unknown>,
              oldRecord: payload.old as Record<string, unknown>,
            }),
            ...current,
          ]);
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
      void supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  function handleOpenCenter() {
    setIsOpen(true);
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
  }

  if (supabaseConfigError) {
    return null;
  }

  return (
    <>

      {isOpen ? (
        <Modal
          onClose={() => setIsOpen(false)}
          placement="top-right"
          size="compact"
          title="Cambios recientes"
        >
          <div className="notifications-panel">
            <p className="notes-meta">
              {notifications.length > 0
                ? `${notifications.length} cambio(s) registrado(s)`
                : "Todavia no hay cambios detectados."}
            </p>

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
