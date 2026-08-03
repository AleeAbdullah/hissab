import type { OutboxHandler } from './outbox.types';
import { OutboxHandlerRegistry } from './outbox-handler.registry';

function handlerFor(...eventTypes: string[]): OutboxHandler {
  return {
    eventTypes,
    handle: jest.fn().mockResolvedValue(undefined),
  };
}

describe('OutboxHandlerRegistry', () => {
  it('returns the handler registered for an event type', () => {
    const registry = new OutboxHandlerRegistry();
    const handler = handlerFor('expense.created', 'expense.updated');

    registry.register(handler);

    expect(registry.get('expense.created')).toBe(handler);
    expect(registry.get('expense.updated')).toBe(handler);
    expect(registry.get('expense.deleted')).toBeUndefined();
  });

  it('rejects duplicate registrations without partially registering a handler', () => {
    const registry = new OutboxHandlerRegistry();
    const first = handlerFor('expense.created');
    const conflicting = handlerFor('payment.created', 'expense.created');
    registry.register(first);

    expect(() => registry.register(conflicting)).toThrow(
      'An outbox handler is already registered for event type "expense.created".',
    );
    expect(registry.get('payment.created')).toBeUndefined();
    expect(registry.get('expense.created')).toBe(first);
  });
});
