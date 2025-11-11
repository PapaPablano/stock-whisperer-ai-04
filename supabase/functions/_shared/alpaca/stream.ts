// supabase/functions/_shared/alpaca/stream.ts
// Shared Alpaca Market Data WebSocket helpers for equities, crypto, news, and options feeds.

import type { AlpacaCredentials } from "./client.ts";

type WebSocketFactory = (url: string) => WebSocket;

export type StreamLifecycleHandlers = {
  onOpen?: (socket: WebSocket) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event | ErrorEvent) => void;
};

export type MessageHandler<T = unknown> = (payload: T, raw: MessageEvent<string>) => void;

export type SubscriptionPayload = {
  action: "subscribe";
  [key: string]: string[] | undefined | "subscribe";
};

const DEFAULT_CONNECT_TIMEOUT_MS = 8_000;

const defaultWebSocketFactory: WebSocketFactory = (url) => new WebSocket(url);

export interface BaseStreamParams<TMessage = unknown> extends StreamLifecycleHandlers {
  credentials: AlpacaCredentials;
  subscriptions: SubscriptionPayload;
  url: string;
  onMessage?: MessageHandler<TMessage>;
  webSocketFactory?: WebSocketFactory;
  connectTimeoutMs?: number;
}

export const connectAlpacaStream = async <TMessage = unknown>(params: BaseStreamParams<TMessage>): Promise<WebSocket> => {
  const {
    credentials,
    subscriptions,
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    webSocketFactory = defaultWebSocketFactory,
    connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
  } = params;

  const socket = webSocketFactory(url);

  const authPayload = JSON.stringify({
    action: "auth",
    key: credentials.key,
    secret: credentials.secret,
  });

  let resolved = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`Alpaca stream connection timed out after ${connectTimeoutMs}ms`));
    }, connectTimeoutMs);

    socket.onopen = () => {
      socket.send(authPayload);
      socket.send(JSON.stringify(subscriptions));
      if (onOpen) onOpen(socket);
      clearTimeout(timeout);
      resolved = true;
      resolve();
    };

    socket.onerror = (event) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(event instanceof ErrorEvent ? event.error ?? event : event);
      }
      if (onError) onError(event);
    };

    socket.onclose = (event) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(event);
      }
      if (onClose) onClose(event);
    };

    if (onMessage) {
      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as TMessage;
          onMessage(parsed, event);
        } catch (error) {
          console.error("[Alpaca Stream] message parse error", error);
        }
      };
    }
  });

  return socket;
};

export const connectEquitiesStream = (params: {
  credentials: AlpacaCredentials;
  symbols: {
    trades?: string[];
    quotes?: string[];
    bars?: string[];
    statuses?: string[];
  };
} & StreamLifecycleHandlers & { onMessage?: MessageHandler }): Promise<WebSocket> => {
  const subscriptions: SubscriptionPayload = {
    action: "subscribe",
    trades: params.symbols.trades,
    quotes: params.symbols.quotes,
    bars: params.symbols.bars,
    statuses: params.symbols.statuses,
  };

  return connectAlpacaStream({
    url: "wss://stream.data.alpaca.markets/v2/iex",
    credentials: params.credentials,
    subscriptions,
    onMessage: params.onMessage,
    onOpen: params.onOpen,
    onClose: params.onClose,
    onError: params.onError,
  });
};

export const connectCryptoStream = (params: {
  credentials: AlpacaCredentials;
  symbols: {
    trades?: string[];
    quotes?: string[];
    bars?: string[];
    orderbooks?: string[];
  };
} & StreamLifecycleHandlers & { onMessage?: MessageHandler }): Promise<WebSocket> => {
  const subscriptions: SubscriptionPayload = {
    action: "subscribe",
    trades: params.symbols.trades,
    quotes: params.symbols.quotes,
    bars: params.symbols.bars,
    orderbooks: params.symbols.orderbooks,
  };

  return connectAlpacaStream({
    url: "wss://stream.data.alpaca.markets/v1beta3/crypto/us",
    credentials: params.credentials,
    subscriptions,
    onMessage: params.onMessage,
    onOpen: params.onOpen,
    onClose: params.onClose,
    onError: params.onError,
  });
};

export const connectNewsStream = (params: {
  credentials: AlpacaCredentials;
  topics?: string[];
} & StreamLifecycleHandlers & { onMessage?: MessageHandler }): Promise<WebSocket> => {
  const subscriptions: SubscriptionPayload = {
    action: "subscribe",
    news: params.topics && params.topics.length > 0 ? params.topics : ["*"],
  };

  return connectAlpacaStream({
    url: "wss://stream.data.alpaca.markets/v1beta1/news",
    credentials: params.credentials,
    subscriptions,
    onMessage: params.onMessage,
    onOpen: params.onOpen,
    onClose: params.onClose,
    onError: params.onError,
  });
};

export const connectOptionsStream = (params: {
  credentials: AlpacaCredentials;
  symbols: {
    trades?: string[];
    quotes?: string[];
    bars?: string[];
  };
  feed?: "opra" | "indicative";
} & StreamLifecycleHandlers & { onMessage?: MessageHandler }): Promise<WebSocket> => {
  const url = params.feed === "indicative"
    ? "wss://stream.data.alpaca.markets/v1beta1/options/indicative"
    : "wss://stream.data.alpaca.markets/v1beta1/options";

  const subscriptions: SubscriptionPayload = {
    action: "subscribe",
    trades: params.symbols.trades,
    quotes: params.symbols.quotes,
    bars: params.symbols.bars,
  };

  return connectAlpacaStream({
    url,
    credentials: params.credentials,
    subscriptions,
    onMessage: params.onMessage,
    onOpen: params.onOpen,
    onClose: params.onClose,
    onError: params.onError,
  });
};
