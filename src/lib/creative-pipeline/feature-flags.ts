export function isCreativePipelineV1Enabled(): boolean {
  return process.env.CREATIVE_PIPELINE_V1 === "1";
}

export function isOriginalPipelineV2Enabled(): boolean {
  return process.env.ORIGINAL_PIPELINE_V2 === "1";
}
