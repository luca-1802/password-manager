declare namespace chrome {
  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>;
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };
    interface MessageSender {
      tab?: tabs.Tab;
      id?: string;
    }
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
    function query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
    }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    }
    const local: StorageArea;
    const session: StorageArea;
  }

  namespace alarms {
    interface Alarm {
      name: string;
    }
    function create(
      name: string,
      alarmInfo: { periodInMinutes?: number }
    ): void;
    const onAlarm: {
      addListener(callback: (alarm: Alarm) => void): void;
    };
  }

  namespace action {
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  }
}