import assert from "node:assert/strict";
import test from "node:test";
import {admitSource,runInkOSWorkflow,type Phase,type Source} from "../src/index.ts";
const source:Source={projectId:"project123",episodeNumber:1,sourceRevision:"current-1",
 plot:"A sealed letter goes missing",characters:"A suspects no one yet",
 execution:"Scene reversal, physical clue, ending hook",format:"JSON episode"};
const outputs:Record<Phase,string>={
 plan:'{"mustKeep":["clue"],"mustAvoid":["future"]}',
 compose:'{"sceneBeats":["loss","resistance","turn"]}',
 write:'{"episodeNumber":1,"content":"a real scene candidate"}',
 observe:'{"stateDeltas":[],"continuityWarnings":[]}',
 audit:'{"observations":[],"sourceConflicts":[],"suggestedFixes":[]}',
 revise:'{"episodeNumber":1,"content":"a revised scene candidate"}'};
test("5 phases are traceable, revision remains explicit",async()=>{
 const invoked:Phase[]=[];
 const result=await runInkOSWorkflow({source,requestId:"public-test-0001",invoke:async x=>{
  assert.equal(x.sourceSha256,admitSource(source));invoked.push(x.phase);return outputs[x.phase]}});
 assert.equal(result.applied,false);
 assert.equal(result.sdkExecutions,5);
 assert.deepEqual(invoked,["plan","compose","write","observe","audit"]);
 const updated=await runInkOSWorkflow({source,requestId:"public-test-0002",
  revisionIntent:"spot-fix",invoke:async x=>outputs[x.phase]});
 assert.equal(updated.sdkExecutions,6);
 assert.notEqual(updated.candidateSha256,result.candidateSha256);
});
test("invalid CURRENT evidence and malformed phase fail closed",async()=>{
 await assert.rejects(runInkOSWorkflow({source:{...source,plot:""},
  requestId:"public-test-0003",invoke:async x=>outputs[x.phase]}),/INPUT1_INVALID/);
 await assert.rejects(runInkOSWorkflow({source,requestId:"public-test-0004",
  invoke:async x=>x.phase==="plan"?"junk":outputs[x.phase]}),/PLAN_JSON_INVALID/);
});
test("revised body never inherits original draft's state and audit",async()=>{
 const answers={...outputs,
  write:'{"episodeNumber":1,"event":"letter destroyed"}',
  observe:'{"stateDeltas":["letter destroyed"],"continuityWarnings":[]}',
  audit:'{"observations":["letter destroyed"],"sourceConflicts":["ledger missing"],"suggestedFixes":[]}',
  revise:'{"episodeNumber":1,"event":"letter preserved"}'};
 const initial=await runInkOSWorkflow({source,requestId:"review-test-0001",
  invoke:async a=>answers[a.phase]});
 assert.equal(initial.reviewStatus,"REVIEWED");
 assert.equal(initial.reviewedCandidateSha256,initial.candidateSha256);
 assert.deepEqual(initial.proposedStateDeltas,["letter destroyed"]);
 const revised=await runInkOSWorkflow({source,requestId:"review-test-0002",
  revisionIntent:"rewrite",invoke:async a=>answers[a.phase]});
 assert.equal(revised.reviewStatus,"REVIEW_REQUIRED");
 assert.equal(revised.reviewedCandidateSha256,null);
 assert.equal(revised.proposedStateDeltas,null);
 assert.equal(revised.reviewObservations,null);
 assert.equal(revised.sourceConflicts,null);
 assert.equal(revised.priorReview?.candidateSha256,initial.candidateSha256);
 assert.deepEqual(revised.priorReview?.proposedStateDeltas,["letter destroyed"]);
 assert.notEqual(revised.candidateSha256,revised.priorReview?.candidateSha256);
});
test("long CURRENT input and 12k body complete within 30k prompts",async()=>{
 const longSource={...source,plot:"X".repeat(19000)};
 const bigBody='{"episodeNumber":1,"text":"'+ "B".repeat(11900)+'"}';
 const phases:Phase[]=[];
 const res=await runInkOSWorkflow({source:longSource,
  requestId:"budget-test-0001",revisionIntent:"polish",
  invoke:async a=>{
   phases.push(a.phase);
   assert.ok(a.prompt.length<=30000);
   assert.ok(a.prompt.includes("OUTPUT_LIMIT_CHARS="));
   return a.phase==="write"?bigBody:a.phase==="revise"?
    bigBody.replace("BBBBBB","CCCCCC"):outputs[a.phase];
  }});
 assert.equal(res.reviewContextMode,"PLAN_PROJECTION");
 assert.equal(res.reviewStatus,"REVIEW_REQUIRED");
 assert.equal(res.sdkExecutions,6);
 assert.deepEqual(phases,["plan","compose","write","observe","audit","revise"]);
});
test("oversized body fails before downstream paid calls",async()=>{
 const phases:Phase[]=[];
 await assert.rejects(runInkOSWorkflow({source,requestId:"budget-test-0002",
  invoke:async a=>{phases.push(a.phase);
   return a.phase==="write"?"W".repeat(18001):outputs[a.phase];
  }}),/INKOS_WRITE_EMPTY_OR_OVERSIZE/);
 assert.deepEqual(phases,["plan","compose","write"]);
});
