import type { EngineeringEvent } from "./types";

export interface EventLedger {
  append(event: EngineeringEvent): void;
  list(): EngineeringEvent[];
}

export function createEventLedger(initialEvents: EngineeringEvent[] = []): EventLedger {
  const events = [...initialEvents];

  return {
    append(event) {
      if (events.some((existingEvent) => existingEvent.id === event.id)) {
        throw new Error(`Event already exists: ${event.id}`);
      }

      events.push(event);
    },
    list() {
      return [...events];
    }
  };
}

