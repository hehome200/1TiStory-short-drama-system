export function isQualityOsV1Enabled(): boolean {
  return process.env.QUALITY_OS_V1 === '1';
}

export function isQualityReportsV1Enabled(): boolean {
  return process.env.QUALITY_REPORTS_V1 === '1';
}

export function isQualityReportsUiV1Enabled(): boolean {
  return process.env.NEXT_PUBLIC_QUALITY_REPORTS_UI_V1 === '1';
}
