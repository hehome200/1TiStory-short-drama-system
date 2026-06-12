export type FeatureFlags = {
  allowByok: boolean;
  allowNewByokBinding: boolean;
  allowExistingByokUsage: boolean;
  byokServiceAuraCost: number;
};

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  allowByok: true,
  allowNewByokBinding: true,
  allowExistingByokUsage: true,
  byokServiceAuraCost: 0,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return DEFAULT_FEATURE_FLAGS;
}

export async function setFeatureFlags(flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
  const payload = {
    allowByok: flags.allowByok !== undefined ? flags.allowByok : DEFAULT_FEATURE_FLAGS.allowByok,
    allowNewByokBinding:
      flags.allowNewByokBinding !== undefined ? flags.allowNewByokBinding : DEFAULT_FEATURE_FLAGS.allowNewByokBinding,
    allowExistingByokUsage:
      flags.allowExistingByokUsage !== undefined
        ? flags.allowExistingByokUsage
        : DEFAULT_FEATURE_FLAGS.allowExistingByokUsage,
    byokServiceAuraCost:
      flags.byokServiceAuraCost !== undefined
        ? flags.byokServiceAuraCost
        : DEFAULT_FEATURE_FLAGS.byokServiceAuraCost,
  };
  return payload;
}
