#!/usr/bin/env node

/**
 * Idempotent provisioning script for the sunshade-docs Cloudflare Pages project
 * and its production/staging custom domains (docs.sunshade.icu & docs-stag.sunshade.icu).
 *
 * Required environment variables:
 *   CLOUDFLARE_API_TOKEN   - Cloudflare API token with Pages:Edit and DNS:Edit permissions
 *   CLOUDFLARE_ACCOUNT_ID  - Cloudflare Account ID
 *
 * Optional environment variables:
 *   CLOUDFLARE_ZONE_ID     - Zone ID for sunshade.icu (auto-discovered if omitted)
 */

const CF_API = 'https://api.cloudflare.com/client/v4';
const PROJECT_NAME = 'sunshade-docs';
const PRODUCTION_DOMAIN = 'docs.sunshade.icu';
const STAGING_DOMAIN = 'docs-stag.sunshade.icu';
const ROOT_ZONE = 'sunshade.icu';

const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';

if (!apiToken || !accountId) {
  console.error('Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set.');
  console.error('Export both variables and re-run: node scripts/provision-cloudflare-pages.mjs');
  process.exit(1);
}

async function cfRequest(path, options = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await res.json();
  return { ok: res.ok && payload.success, status: res.status, payload };
}

async function ensurePagesProject() {
  const existing = await cfRequest(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}`);
  if (existing.ok) {
    console.log(`[cf:provision] Pages project "${PROJECT_NAME}" already exists.`);
    return existing.payload.result;
  }

  const created = await cfRequest(`/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    body: JSON.stringify({
      name: PROJECT_NAME,
      production_branch: 'main',
    }),
  });

  if (!created.ok) {
    throw new Error(`Failed to create Pages project: ${JSON.stringify(created.payload.errors)}`);
  }

  console.log(`[cf:provision] Created Pages project "${PROJECT_NAME}".`);
  return created.payload.result;
}

async function ensurePagesDomain(domainName) {
  const list = await cfRequest(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains`);
  const existing = list.ok && Array.isArray(list.payload.result)
    ? list.payload.result.find((d) => d.name === domainName)
    : null;

  if (existing) {
    console.log(`[cf:provision] Custom domain "${domainName}" is already bound (status: ${existing.status}).`);
    return;
  }

  const added = await cfRequest(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: domainName }),
  });

  if (!added.ok) {
    throw new Error(`Failed to bind domain "${domainName}": ${JSON.stringify(added.payload.errors)}`);
  }

  console.log(`[cf:provision] Bound custom domain "${domainName}" to "${PROJECT_NAME}".`);
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID;

  const zones = await cfRequest(`/zones?name=${encodeURIComponent(ROOT_ZONE)}`);
  const zone = zones.ok && Array.isArray(zones.payload.result) ? zones.payload.result[0] : null;
  if (!zone) {
    throw new Error(`Could not resolve Cloudflare Zone ID for "${ROOT_ZONE}". Set CLOUDFLARE_ZONE_ID explicitly.`);
  }
  return zone.id;
}

async function upsertCnameRecord(zoneId, hostname, target) {
  const list = await cfRequest(
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(hostname)}`
  );
  const existing = list.ok && Array.isArray(list.payload.result) ? list.payload.result[0] : null;

  const body = {
    type: 'CNAME',
    name: hostname,
    content: target,
    proxied: true,
    ttl: 1,
  };

  if (existing) {
    if (existing.content === target && existing.proxied === true) {
      console.log(`[cf:provision] DNS CNAME ${hostname} -> ${target} already configured.`);
      return;
    }
    const updated = await cfRequest(`/zones/${zoneId}/dns_records/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!updated.ok) {
      throw new Error(`Failed to update DNS record ${hostname}: ${JSON.stringify(updated.payload.errors)}`);
    }
    console.log(`[cf:provision] Updated DNS CNAME ${hostname} -> ${target}.`);
    return;
  }

  const created = await cfRequest(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!created.ok) {
    throw new Error(`Failed to create DNS record ${hostname}: ${JSON.stringify(created.payload.errors)}`);
  }
  console.log(`[cf:provision] Created DNS CNAME ${hostname} -> ${target}.`);
}

await ensurePagesProject();
await ensurePagesDomain(PRODUCTION_DOMAIN);
await ensurePagesDomain(STAGING_DOMAIN);

const zoneId = await resolveZoneId();
await upsertCnameRecord(zoneId, PRODUCTION_DOMAIN, `${PROJECT_NAME}.pages.dev`);
await upsertCnameRecord(zoneId, STAGING_DOMAIN, `staging.${PROJECT_NAME}.pages.dev`);

console.log('[cf:provision] Cloudflare Pages project and custom domains provisioned.');
