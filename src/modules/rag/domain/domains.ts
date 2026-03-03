import type { KBDomain } from "./types"

const DOMAINS: Map<string, KBDomain> = new Map()

export function registerKBDomain(domain: KBDomain): void {
  DOMAINS.set(domain.id, domain)
}

export function getKBDomain(id: string): KBDomain {
  const domain = DOMAINS.get(id)
  if (!domain) throw new Error(`KBDomain "${id}" no registrado`)
  return domain
}

export function getAllKBDomains(): KBDomain[] {
  return Array.from(DOMAINS.values())
}

export function hasKBDomain(id: string): boolean {
  return DOMAINS.has(id)
}

export function resolveNamespaces(domainIds: string[]): string[] {
  return domainIds.map(id => getKBDomain(id).namespace)
}
