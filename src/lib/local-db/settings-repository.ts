import { localDb } from "./database";

export type LocalProviderSettings = {
  provider: "openai";
  apiKey: string;
  baseUrl: string;
  model: string;
  saveToIndexedDb: boolean;
};

export type LocalAppSettings = {
  key: string;
  value: unknown;
};

const PROVIDER_SETTINGS_ID = "provider";

export async function loadProviderSettings(): Promise<LocalProviderSettings | null> {
  const row = await localDb.providerSettings.get(PROVIDER_SETTINGS_ID);
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as LocalProviderSettings;
  } catch {
    return null;
  }
}

export async function saveProviderSettings(settings: LocalProviderSettings) {
  await localDb.providerSettings.put({
    id: PROVIDER_SETTINGS_ID,
    updatedAt: new Date().toISOString(),
    payload: JSON.stringify(settings),
  });
}

export async function loadAppSetting<T>(key: string): Promise<T | null> {
  const row = await localDb.appSettings.get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function saveAppSetting(key: string, value: unknown) {
  await localDb.appSettings.put({
    key,
    updatedAt: new Date().toISOString(),
    payload: JSON.stringify(value),
  });
}
