export const LOCAL_DB_NAME = "1tistory-community-local-first";
export const LOCAL_DB_VERSION = 1;

export type LocalProjectKind = "original" | "rewrite";

export type LocalProjectRow = {
  id: string;
  kind: LocalProjectKind;
  title: string;
  projectType: string;
  createdAt: string;
  updatedAt: string;
  payload: string;
};

export type LocalProjectDraftRow = {
  id: string;
  projectId: string;
  kind: LocalProjectKind;
  updatedAt: string;
  payload: string;
};

export type LocalProviderSettingsRow = {
  id: string;
  updatedAt: string;
  payload: string;
};

export type LocalAppSettingsRow = {
  key: string;
  updatedAt: string;
  payload: string;
};
