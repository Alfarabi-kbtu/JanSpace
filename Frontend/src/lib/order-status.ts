"use client";

import { useEffect, useRef } from "react";
import { getAccessToken } from "./auth";
import type { OrderStatus } from "./types";

export type OrderStatusEvent = {
  order_id: string;
  order_status: OrderStatus;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

// Один WebSocket на статус заказов текущего юзера (см. Frontend/CLAUDE.md):
// однонаправленный (сервер сам присылает события, ничего в него не
// отправляем), уже отфильтрован сервером по текущему пользователю.
// onUpdate передаётся через ref, чтобы смена коллбэка между рендерами не
// пересоздавала соединение
export function useOrderStatusUpdates(onUpdate: (event: OrderStatusEvent) => void) {
  const onUpdateRef = useRef(onUpdate);

  // Обновляем ref после каждого рендера (не во время него — React ругается
  // на запись в ref прямо в теле функции компонента/хука), чтобы соединение
  // ниже всегда звало актуальный коллбэк без пересоздания сокета
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    function connect() {
      const token = getAccessToken();
      // Без токена подключаться бессмысленно — сервер сразу закроет
      // соединение (см. JWTAuthMiddleware на бэкенде)
      if (!token || stopped) return;

      socket = new WebSocket(`${WS_URL}/ws/orders/?token=${token}`);

      socket.onmessage = (event) => {
        try {
          onUpdateRef.current(JSON.parse(event.data) as OrderStatusEvent);
        } catch {
          // нераспознанное сообщение — игнорируем
        }
      };

      // Если access-токен истёк, сервер закрывает соединение сразу
      // (см. Frontend/CLAUDE.md) — переоткрываем его через паузу с тем
      // токеном, что актуален на тот момент (возможно, уже обновлённым
      // через refresh-flow каким-то API-запросом за это время), а не
      // сразу, чтобы не долбить сервер в цикле, если токена всё ещё нет
      socket.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
