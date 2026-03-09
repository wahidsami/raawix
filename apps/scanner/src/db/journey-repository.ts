/**
 * Phase 4: Repository for Journey definitions (deterministic steps per Property).
 * Persistence only; no execution logic. Execution will be added in Phase 4.1.
 * Journeys are deterministic; credentials must be referenced via env placeholders (e.g. ${env:VAR}).
 */

import { getPrismaClient } from './client.js';

export type JourneyWhen = 'before_crawl' | 'after_crawl';

export interface JourneyRecord {
  id: string;
  propertyId: string;
  name: string;
  when: JourneyWhen;
  stepsJson: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get enabled journeys for a property (for execution hook).
 */
export async function getEnabledJourneysByProperty(
  propertyId: string
): Promise<JourneyRecord[]> {
  const prisma = await getPrismaClient();
  if (!prisma) return [];

  const rows = await prisma.journey.findMany({
    where: { propertyId, enabled: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toRecord);
}

/**
 * Get all journeys for a property (for CRUD/listing).
 */
export async function getJourneysByProperty(
  propertyId: string
): Promise<JourneyRecord[]> {
  const prisma = await getPrismaClient();
  if (!prisma) return [];

  const rows = await prisma.journey.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toRecord);
}

/**
 * Create a journey.
 */
export async function createJourney(params: {
  propertyId: string;
  name: string;
  when: JourneyWhen;
  stepsJson: unknown;
  enabled?: boolean;
}): Promise<JourneyRecord | null> {
  const prisma = await getPrismaClient();
  if (!prisma) return null;

  const row = await prisma.journey.create({
    data: {
      propertyId: params.propertyId,
      name: params.name,
      when: params.when,
      stepsJson: params.stepsJson as object,
      enabled: params.enabled ?? true,
    },
  });
  return toRecord(row);
}

/**
 * Update a journey.
 */
export async function updateJourney(
  id: string,
  params: {
    name?: string;
    when?: JourneyWhen;
    stepsJson?: unknown;
    enabled?: boolean;
  }
): Promise<JourneyRecord | null> {
  const prisma = await getPrismaClient();
  if (!prisma) return null;

  const row = await prisma.journey.update({
    where: { id },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.when !== undefined && { when: params.when }),
      ...(params.stepsJson !== undefined && { stepsJson: params.stepsJson as object }),
      ...(params.enabled !== undefined && { enabled: params.enabled }),
      updatedAt: new Date(),
    },
  });
  return toRecord(row);
}

/**
 * Disable a journey (soft-disable via enabled flag).
 */
export async function disableJourney(id: string): Promise<boolean> {
  const prisma = await getPrismaClient();
  if (!prisma) return false;

  await prisma.journey.update({
    where: { id },
    data: { enabled: false, updatedAt: new Date() },
  });
  return true;
}

function toRecord(row: {
  id: string;
  propertyId: string;
  name: string;
  when: string;
  stepsJson: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): JourneyRecord {
  return {
    id: row.id,
    propertyId: row.propertyId,
    name: row.name,
    when: row.when as JourneyWhen,
    stepsJson: row.stepsJson,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
