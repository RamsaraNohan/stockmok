import { commandDefinitions, type ActiveCommandId } from '@stockmok/shared';
import type { CommandHandler } from './define-command.js';

/**
 * The command registry.
 *
 * Deployment names map dot-case → camelCase (`stock.transfer` → `stockTransfer`)
 * and each command is exported individually from `index.ts`, so Firebase deploys
 * it as a separate function with its own logs, metrics and redeploy (DB-06 §1,
 * control pack 11 §12). The registry is what makes "every active command has
 * exactly one handler" checkable rather than assumed.
 *
 * B1 registers nothing. B2, B3 and B4 fill it; `functions/src/commands/coverage.ts`
 * records which phase owns which id.
 */

export class CommandRegistry {
  readonly #handlers = new Map<ActiveCommandId, CommandHandler>();

  register(handler: CommandHandler): CommandHandler {
    const contract = commandDefinitions[handler.id] as
      { readonly name: string; readonly idempotent: boolean } | undefined;
    if (!contract) {
      throw new Error(`${handler.id} is not an active command id.`);
    }
    if (handler.name !== contract.name) {
      throw new Error(
        `${handler.id} is registered as "${handler.name}" but the catalog names it "${contract.name}".`,
      );
    }
    if (handler.idempotent !== contract.idempotent) {
      throw new Error(`${handler.id} disagrees with the catalog on its idempotency flag.`);
    }
    if (this.#handlers.has(handler.id)) {
      throw new Error(`${handler.id} is already registered.`);
    }
    this.#handlers.set(handler.id, handler);
    return handler;
  }

  get(id: ActiveCommandId): CommandHandler | undefined {
    return this.#handlers.get(id);
  }

  ids(): readonly ActiveCommandId[] {
    return [...this.#handlers.keys()].sort();
  }

  size(): number {
    return this.#handlers.size;
  }

  /** Ids in the frozen catalog that no phase has implemented yet. */
  missingIds(): readonly ActiveCommandId[] {
    return (Object.keys(commandDefinitions) as ActiveCommandId[])
      .filter((id) => !this.#handlers.has(id))
      .sort();
  }

  clear(): void {
    this.#handlers.clear();
  }
}

export const commandRegistry = new CommandRegistry();

/** camelCase deployment name for a dot-case catalog name. */
export function deploymentName(commandName: string): string {
  return commandName
    .split('.')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}
