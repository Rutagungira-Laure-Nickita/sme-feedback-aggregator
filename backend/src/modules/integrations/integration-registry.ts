import { IntegrationMode, IntegrationProvider } from "@prisma/client";
import { createDemoConnectors } from "./demo-connectors.js";
import { EmailLiveConnector } from "./email-live-connector.js";
import { MetaSocialLiveConnector } from "./meta-social-live-connector.js";
import { WhatsAppLiveConnector } from "./whatsapp-live-connector.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import type {
  ExternalFeedbackConnector,
  IntegrationProviderCapabilities
} from "./integration.types.js";

export class IntegrationConnectorRegistry {
  private readonly connectors = new Map<string, ExternalFeedbackConnector>();

  public register(connector: ExternalFeedbackConnector): void {
    this.connectors.set(key(connector.provider, connector.mode), connector);
  }

  public getConnector(
    provider: IntegrationProvider,
    mode: IntegrationMode
  ): ExternalFeedbackConnector {
    const connector = this.connectors.get(key(provider, mode));

    if (!connector) {
      throw new IntegrationError(
        "This integration provider is not available.",
        INTEGRATION_ERRORS.PROVIDER_UNSUPPORTED,
        400
      );
    }

    if (!connector.supportsMode(mode)) {
      throw new IntegrationError(
        "This integration mode is not available.",
        INTEGRATION_ERRORS.MODE_UNSUPPORTED,
        400
      );
    }

    return connector;
  }

  public listProviders(): IntegrationProviderCapabilities[] {
    return [...this.connectors.values()].map((connector) => connector.getCapabilities());
  }
}

export function createIntegrationConnectorRegistry(): IntegrationConnectorRegistry {
  const registry = new IntegrationConnectorRegistry();
  createDemoConnectors().forEach((connector) => registry.register(connector));
  registry.register(new EmailLiveConnector());
  registry.register(new WhatsAppLiveConnector());
  registry.register(new MetaSocialLiveConnector(IntegrationProvider.FACEBOOK));
  registry.register(new MetaSocialLiveConnector(IntegrationProvider.INSTAGRAM));
  return registry;
}

export const integrationConnectorRegistry = createIntegrationConnectorRegistry();

function key(provider: IntegrationProvider, mode: IntegrationMode): string {
  return `${provider}:${mode}`;
}
