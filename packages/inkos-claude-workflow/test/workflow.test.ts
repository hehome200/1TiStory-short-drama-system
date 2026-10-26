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
