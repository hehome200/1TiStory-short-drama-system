/**
 * InkOS narrative workflow adapted for an externally owned Claude Agent SDK
 * execution adapter. Original adaptation: 1TiStory. Upstream AGPL-3.0-only
 * skill resources are separately attributed in UPSTREAM.md.
 *
 * No model client, pi-agent, database, shell, filesystem, or hidden retry.
 * The embedding Writer owns every Provider Attempt, proposal and Apply.
 */
import { createHash } from "node:crypto";
export type Phase = "plan" | "compose" | "write" | "observe" | "audit" | "revise";
export type Invoke = (action: Readonly<{
  phase: Phase; requestId: string; prompt: string;
  sourceSha256: string;
}>) => Promise<string>;
export type Source = Readonly<{
  projectId: string; episodeNumber: number; sourceRevision: string;
  /** Four individually qualified CURRENT Writer inputs, never old candidates. */
  plot: string; characters: string; execution: string; format: string;
  /** Current-only safe evidence projected by the embedding application. */
  evidence?: readonly { id: string; sha256: string; excerpt: string }[];
}>;
export type RunInput = Readonly<{
  source: Source; requestId: string; invoke: Invoke;
  /** Review cannot authorize a rewrite. A revision is separately explicit. */
  revisionIntent?: "spot-fix" | "polish" | "rewrite" | "rework";
}>;
export type PhaseResult = Readonly<{
  phase: Phase; requestId: string; sha256: string; text: string;
}>;
const SHA = /^[0-9a-f]{64}$/;
const ID = /^[a-zA-Z0-9_-]{8,100}$/;
export const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const bound = (text: string, max: number, code: string) => {
  if (typeof text !== "string" || !text.trim() || text.length > max)
    throw new Error(code);
  return text.trim();
};
export function admitSource(source: Source): string {
  if (!ID.test(source.projectId) || !Number.isSafeInteger(source.episodeNumber) ||
      source.episodeNumber < 1 || source.episodeNumber > 200 ||
      !source.sourceRevision || source.sourceRevision.length > 160)
    throw new Error("INKOS_WORKFLOW_SOURCE_INVALID");
  for (const [i,part] of [source.plot,source.characters,source.execution,source.format].entries())
    bound(part,20000,"INKOS_WORKFLOW_INPUT"+(i+1)+"_INVALID");
  if ((source.evidence?.length ?? 0) > 12 ||
      source.evidence?.some(e => !e.id || !SHA.test(e.sha256) ||
        !e.excerpt || e.excerpt.length > 1500))
    throw new Error("INKOS_WORKFLOW_EVIDENCE_INVALID");
  return digest(JSON.stringify([source.projectId,source.episodeNumber,
    source.sourceRevision,source.plot,source.characters,source.execution,
    source.format,source.evidence ?? []]));
}
const json = (value: string, code: string): Record<string,unknown> => {
  const cleaned = value.trim().replace(/^\x60\x60\x60(?:json)?\s*/,"").replace(/\s*\x60\x60\x60$/,"");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error(code); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(code);
  return parsed as Record<string,unknown>;
};
const phaseOutput = (value: unknown, max: number, code: string) =>
  bound(value as string,max,code);
const method=[
 "InkOS drama method: objective, resistance, turn, consequence.",
 "Preserve author intent, character knowledge and CURRENT canon.",
 "Translate motives into playable actions; dialogue need not answer questions.",
 "Every scene changes stakes; the ending hook is an event, not summary.",
 "Review produces evidence-backed observations, not numeric scores.",
].join("\n");
export async function runInkOSWorkflow(input:RunInput){
 const sourceSha256=admitSource(input.source);
 if(!ID.test(input.requestId))throw Error("INKOS_WORKFLOW_REQUEST_INVALID");
 const s=input.source;
 const evidence=(s.evidence??[]).map(e=>"["+e.id+" "+e.sha256+"] "+e.excerpt).join("\n");
 const authority=[
  "Project "+s.projectId+" EP"+s.episodeNumber+" CURRENT "+s.sourceRevision+" "+sourceSha256,
  "INPUT1 PLOT:\n"+s.plot,"INPUT2 CHARACTER:\n"+s.characters,
  "INPUT3 EXECUTION:\n"+s.execution,"INPUT4 FORMAT:\n"+s.format,
  "CURRENT ONLY EVIDENCE:\n"+evidence,method,
 ].join("\n\n");
 if(authority.length>22000)throw Error("INKOS_CONTEXT_OVER_BUDGET");
 const phases:PhaseResult[]=[];
 // All outputs must fit into subsequent 30k-character SDK prompts.
 const MAX_PROMPT_CHARS=30000;
 const MAX_OUTPUT:Record<Phase,number>={
  plan:1800,compose:2400,write:18000,observe:1800,audit:2400,revise:18000,
 };
 const run=async(phase:Phase,prompt:string)=>{
  const boundedPrompt=prompt+"\nOUTPUT_LIMIT_CHARS="+MAX_OUTPUT[phase]+
   "; keep the full response within this limit.";
  if(boundedPrompt.length>MAX_PROMPT_CHARS)throw Error("INKOS_PROMPT_TOO_LONG");
  const requestId=input.requestId+"-"+phase;
  const response=phaseOutput(await input.invoke({
   phase,requestId,prompt:boundedPrompt,sourceSha256,
  }),MAX_OUTPUT[phase],"INKOS_"+phase.toUpperCase()+"_EMPTY_OR_OVERSIZE");
  phases.push({phase,requestId,sha256:digest(response),text:response});
  return response;
 };
 const plan=await run("plan",authority+"\nProduce JSON: mustKeep[], mustAvoid[], objectives[], conflictTurns[], hook. No invented canon.");
 const p=json(plan,"INKOS_PLAN_JSON_INVALID");
 if(!Array.isArray(p.mustKeep)||!Array.isArray(p.mustAvoid))throw Error("INKOS_PLAN_CONTRACT_INVALID");
 const compose=await run("compose",authority+"\nPLAN:\n"+plan+
  "\nProduce JSON: sceneBeats[], characterActions[], contextRisks[].");
 const c=json(compose,"INKOS_COMPOSE_JSON_INVALID");
 if(!Array.isArray(c.sceneBeats))throw Error("INKOS_COMPOSE_CONTRACT_INVALID");
 let candidate=await run("write",authority+"\nPLAN:\n"+plan+
  "\nSCENE DESIGN:\n"+compose+
  "\nWrite complete episode in INPUT4 format. Output only candidate body. Never Apply.");
 const observe=await run("observe","EPISODE BODY:\n"+candidate+
  "\nCURRENT SOURCE SHA256 "+sourceSha256+
  "\nReturn JSON: stateDeltas[], continuityWarnings[], evidenceRefs[]. Proposed changes only.");
 const o=json(observe,"INKOS_OBSERVE_JSON_INVALID");
 if(!Array.isArray(o.stateDeltas)||!Array.isArray(o.continuityWarnings))
  throw Error("INKOS_OBSERVE_CONTRACT_INVALID");
 const initialCandidateSha256=digest(candidate);
 // Keep complete CURRENT facts where they fit. For long bodies use an
 // explicitly labeled plan projection rather than silently truncating canon.
 const auditTail="\nBODY:\n"+candidate+"\nPROPOSED DELTAS:\n"+observe+
  "\nReturn JSON: observations[], sourceConflicts[], suggestedFixes[]. "+
  "Evidence-only; do not invent CURRENT facts, score or rewrite.";
 const fullAudit=authority+auditTail;
 const auditContextMode=fullAudit.length+96<=MAX_PROMPT_CHARS
  ? "CURRENT_INPUTS" as const:"PLAN_PROJECTION" as const;
 const auditPrefix=auditContextMode==="CURRENT_INPUTS"?authority:
  "CURRENT SOURCE SHA256="+sourceSha256+
  "\nREVIEW SCOPE=PLAN_PROJECTION; full source unavailable in this stage. "+
  "Do not claim source conflicts verified without direct evidence."+
  "\nLOCKED PLAN:\n"+plan;
 const audit=await run("audit",auditPrefix+auditTail);
 const a=json(audit,"INKOS_AUDIT_JSON_INVALID");
 if(!Array.isArray(a.observations)||!Array.isArray(a.sourceConflicts)||
    !Array.isArray(a.suggestedFixes))throw Error("INKOS_AUDIT_CONTRACT_INVALID");
 if(input.revisionIntent){
  if(!["spot-fix","polish","rewrite","rework"].includes(input.revisionIntent))
   throw Error("INKOS_REVISION_MODE_INVALID");
  const reviseTail="\nEXPLICIT REVISION: "+input.revisionIntent+
   "\nCURRENT CANDIDATE:\n"+candidate+"\nREVIEW:\n"+audit+
   "\nOutput full revised episode in INPUT4 format. No canonical Apply.";
  const fullRevise=authority+reviseTail;
  const reviseAuthority=fullRevise.length+96<=MAX_PROMPT_CHARS?authority:
   "CURRENT SOURCE SHA256="+sourceSha256+
   "\nLOCKED PLAN:\n"+plan+
   "\nSCENE DESIGN:\n"+compose+
   "\nREVISION SCOPE=PLAN_PROJECTION. Do not invent new facts.";
  candidate=await run("revise",reviseAuthority+reviseTail);
 }
 const reviewedCandidateSha256=digest(candidate)===initialCandidateSha256
  ?initialCandidateSha256:null;
 const priorReview=reviewedCandidateSha256?null:{
  candidateSha256:initialCandidateSha256,
  sourceContextMode:auditContextMode,
  proposedStateDeltas:o.stateDeltas,
  reviewObservations:a.observations,
  sourceConflicts:a.sourceConflicts,
 };
 return Object.freeze({
  projectId:s.projectId,episodeNumber:s.episodeNumber,
  sourceRevision:s.sourceRevision,sourceSha256,
  outputDisposition:"candidate_requires_review" as const,
  candidate,candidateSha256:digest(candidate),
  reviewStatus:reviewedCandidateSha256?"REVIEWED":"REVIEW_REQUIRED" as const,
  reviewedCandidateSha256,reviewContextMode:auditContextMode,priorReview,
  proposedStateDeltas:reviewedCandidateSha256?o.stateDeltas:null,
  reviewObservations:reviewedCandidateSha256?a.observations:null,
  sourceConflicts:reviewedCandidateSha256?a.sourceConflicts:null,phases,
  sdkExecutions:phases.length,applied:false as const,
  providerBillingStatus:"EXTERNAL_OWNER" as const,
 });
}
