-- Phase 23 Live Outlook / Microsoft Email support allows one Live Email
-- connection per email provider type (Gmail and Microsoft) per business.
DROP INDEX `integration_connections_business_id_provider_mode_key` ON `integration_connections`;

CREATE UNIQUE INDEX `conn_live_email_provider_key` ON `integration_connections`(
  `business_id`,
  `provider`,
  `mode`,
  `live_provider_type`
);
