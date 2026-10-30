import test from "node:test";
import assert from "node:assert/strict";
import {sha256,planWorkflow,acceptReceipt,runWithHost,type Source,type Receipt}
 from "../src/index.ts";

const body=["第一集","1-1 医署 日 内","△ 女医诊脉。","刘迟：别动。"].join("\n");
const source:Source={projectId:"projecttest",episodeNumber:1,sourceRevision:"r1",
 body,bodySha256:sha256(body),targetDurationSec:40,aspectRatio:"9:16",
 lines:[{sourceRef:"m1",lineNumber:1,text:"第一集",kind:"meta"},
 {sourceRef:"s1",lineNumber:2,text:"1-1 医署 日 内",kind:"scene",sceneId:"S1"},
 {sourceRef:"a1",lineNumber:3,text:"△ 女医诊脉。",kind:"action",sceneId:"S1"},
 {sourceRef:"d1",lineNumber:4,text:"刘迟：别动。",kind:"dialogue",sceneId:"S1"}],
 quotes:[{quoteRef:"q1",sourceRef:"d1",text:"别动。"}]};
const director=JSON.stringify({version:"toonflow_director_plan_v1",plan:"诊脉受阻"});
const writer=(refs:string[],quotes:string[])=>JSON.stringify({
 version:"toonflow_storyboard_shots_v1",sceneId:"S1",shots:[
 {sourceRefs:refs,quoteRefs:quotes,visual:"诊脉受阻",framing:"中景",durationSec:3}]});
const reviewer=JSON.stringify({version:"toonflow_storyboard_review_v1",
 sceneId:"S1",passed:false,issues:["动作衔接不足"]});
async function firstReceipt():Promise<Receipt>{
 const p=planWorkflow(source,[]);if(p.status!=="next")throw Error("NO_DIRECTOR");
 return acceptReceipt(source,[],p.action,director);
}
test("nonshootable title and missing QuoteLock fail closed",async()=>{
 const first=await firstReceipt(),plan=planWorkflow(source,[first]);
 if(plan.status!=="next")throw Error("NO_WRITER");
 assert.throws(()=>acceptReceipt(source,[first],plan.action,
   writer(["m1","a1","d1"],["q1"])),/NON_SCENE_REF/);
 assert.throws(()=>acceptReceipt(source,[first],plan.action,
   writer(["a1","d1"],[])),/SOURCE_COVERAGE_INCOMPLETE/);
 const valid=acceptReceipt(source,[first],plan.action,
   writer(["a1","d1"],["q1"]));
 assert.equal(valid.status,"completed");
 assert.equal(planWorkflow(source,[first,valid]).status,"next");
});
test("failed reviewer stops; no implicit self-revision",async()=>{
 const receipts:Receipt[]=[];
 const results:Record<string,string>={director,
 "writer:S1":writer(["a1","d1"],["q1"]),"reviewer:S1":reviewer};
 let count=0;
 const end=await runWithHost({source,loadReceipts:async()=>receipts,
   append:async r=>{receipts.push(r);},
   invoke:async a=>{count++;return results[a.stageId];}});
 assert.equal(end.status,"review_required");assert.equal(count,3);
 if(end.status==="review_required")assert.deepEqual(end.issues,["动作衔接不足"]);
 assert.equal(receipts.length,3);
});
test("Host invocation error is never automatically retried",async()=>{
 let count=0;const receipts:Receipt[]=[];
 await assert.rejects(runWithHost({source,loadReceipts:async()=>receipts,
 append:async r=>{receipts.push(r);},
 invoke:async()=>{count++;throw Error("UNKNOWN");}}),/UNKNOWN/);
 assert.equal(count,1);assert.equal(receipts.length,0);
});
