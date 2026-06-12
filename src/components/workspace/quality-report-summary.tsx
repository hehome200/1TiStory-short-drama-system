'use client';

import type { GenerationQualityReport } from '@/lib/quality-os/types';

type QualityReportSummaryProps = {
  reports?: GenerationQualityReport[];
  showEmptyState?: boolean;
};

function getReportTime(report: GenerationQualityReport): number {
  const time = Date.parse(report.createdAt ?? '');
  return Number.isFinite(time) ? time : 0;
}

function formatReportTime(createdAt: string): string {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return createdAt;
  return new Date(time).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function QualityReportSummary({ reports, showEmptyState = false }: QualityReportSummaryProps) {
  const latestScriptReport = (reports ?? [])
    .filter((report) => report.stage === 'script')
    .slice()
    .sort((left, right) => getReportTime(right) - getReportTime(left))[0];

  if (!latestScriptReport) {
    if (!showEmptyState) return null;

    return (
      <section className='rounded-[28px] border border-white/10 bg-white/4 p-5'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h3 className='text-base font-semibold text-white'>最近质量提示</h3>
            <p className='mt-1 text-xs text-slate-400'>基于已生成的质量报告，只读展示。</p>
          </div>
          <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-400'>
            暂无质量提示
          </span>
        </div>
        <p className='mt-4 text-sm leading-7 text-slate-300'>生成报告能力尚未接入，当前仅支持只读回看。</p>
      </section>
    );
  }

  const issues = latestScriptReport.issues.slice(0, 3);
  const metrics = latestScriptReport.metrics.slice(0, 3);
  const assetRefCount = latestScriptReport.assetRefs?.length ?? 0;

  return (
    <section className='rounded-[28px] border border-cyan-300/20 bg-cyan-300/6 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-base font-semibold text-white'>最近质量提示</h3>
          <p className='mt-1 text-xs text-cyan-100/70'>基于已生成的质量报告，只读展示。</p>
        </div>
        <div className='flex flex-wrap gap-2 text-xs text-slate-300'>
          <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1'>{latestScriptReport.stage}</span>
          <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1'>
            {formatReportTime(latestScriptReport.createdAt)}
          </span>
        </div>
      </div>

      <div className='mt-4 grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-4'>
        <div>
          <div className='text-xs uppercase tracking-[0.2em] text-slate-500'>summary</div>
          <p className='mt-2 text-sm leading-7 text-slate-100'>{latestScriptReport.summary || '暂无摘要'}</p>
        </div>
        <div>
          <div className='text-xs uppercase tracking-[0.2em] text-slate-500'>recommendation</div>
          <p className='mt-2 text-sm leading-7 text-slate-200'>
            {latestScriptReport.recommendation || '暂无建议'}
          </p>
        </div>
      </div>

      <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <div className='rounded-2xl border border-white/10 bg-white/4 p-4'>
          <div className='text-xs uppercase tracking-[0.2em] text-slate-500'>issues</div>
          {issues.length > 0 ? (
            <ul className='mt-3 grid gap-2 text-sm text-slate-200'>
              {issues.map((issue) => (
                <li key={issue.id} className='rounded-xl border border-white/8 bg-black/10 px-3 py-2'>
                  <div className='font-medium text-white'>{issue.title}</div>
                  <div className='mt-1 text-xs leading-6 text-slate-400'>{issue.description}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-3 text-sm text-slate-400'>暂无问题项</p>
          )}
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/4 p-4'>
          <div className='text-xs uppercase tracking-[0.2em] text-slate-500'>metrics</div>
          {metrics.length > 0 ? (
            <ul className='mt-3 grid gap-2 text-sm text-slate-200'>
              {metrics.map((metric) => (
                <li key={metric.id} className='rounded-xl border border-white/8 bg-black/10 px-3 py-2'>
                  <div className='font-medium text-white'>{metric.name}</div>
                  <div className='mt-1 text-xs leading-6 text-slate-400'>
                    {metric.value}
                    {metric.unit ? ` ${metric.unit}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-3 text-sm text-slate-400'>暂无指标</p>
          )}
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/4 p-4'>
          <div className='text-xs uppercase tracking-[0.2em] text-slate-500'>assets</div>
          <div className='mt-3 text-sm text-slate-200'>关联资产 {assetRefCount} 条</div>
          <p className='mt-2 text-sm leading-7 text-slate-400'>
            仅展示轻量引用，不展开完整证据正文或完整资产内容。
          </p>
        </div>
      </div>
    </section>
  );
}
