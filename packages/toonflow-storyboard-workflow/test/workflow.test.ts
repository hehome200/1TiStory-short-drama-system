import test from "node:test";
import assert from "node:assert/strict";
import {runWithHost,planWorkflow,sha256,verifyUpstream,type Source,type Receipt}
 from "../src/index.ts";
const body=["剧名","第一集","1-1 内","△ 诊脉。","刘迟：别动。","1-2 外","△ 出门。"].join("\n");
const source:Source={projectId:"project123",episodeNumber:1,sourceRevision:"v1",
 body,bodySha256:sha256(body),aspectRatio:"9:16",targetDurationSec:60,
 lines:body.split("\n").map((text,i)=>({sourceRef:"u"+i,lineNumber:i+1,text,
 kind:(i<2?"meta":i===2||i===5?"scene":i===4?"dialogue":"action") as
 "meta"|"scene"|"dialogue"|"action",
 ...(i>=2?{sceneId:i<5?"S1":"S2"}:{})})),
 quotes:[{quoteRef:"q1",sourceRef:"u4",text:"别动。"}]};
const outputs:Record<string,string>={
 director:JSON.stringify({version:"toonflow_director_plan_v1",plan:"压迫感"}),
 "writer:S1":JSON.stringify({version:"toonflow_storyboard_shots_v1",sceneId:"S1",
 shots:[{sourceRefs:["u3","u4"],quoteRefs:["q1"],
 visual:"诊脉受阻",framing:"中景",durationSec:4}]}),
 "reviewer:S1":JSON.stringify({version:"toonflow_storyboard_review_v1",sceneId:"S1",passed:true,issues:[]}),
 "writer:S2":JSON.stringify({version:"toonflow_storyboard_shots_v1",sceneId:"S2",
 shots:[{sourceRefs:["u6"],quoteRefs:[],visual:"出门",framing:"全景",durationSec:3}]}),
 "reviewer:S2":JSON.stringify({version:"toonflow_storyboard_review_v1",sceneId:"S2",passed:true,issues:[]})
};
const host=()=>{
 const receipts:Receipt[]=[],calls:string[]=[];
 return {receipts,calls,loadReceipts:async()=>[...receipts],
 append:async(r:Receipt)=>{receipts.push(r);},
 invoke:async(a:{stageId:string})=>{calls.push(a.stageId);return outputs[a.stageId];}};
};
test("originals pinned",()=>assert.equal(verifyUpstream(),7));
test("complete workflow and durable resume",async()=>{
 const h=host();
 assert.equal((await runWithHost({source,...h,maxStages:2})).status,"blocked");
 const done=await runWithHost({source,...h,maxStages:4});
 assert.equal(done.status,"candidate_requires_review");
 if(done.status!=="candidate_requires_review")return;
 assert.equal(done.shots.length,2);
 assert.equal(done.shots.some(s=>s.sourceRefs.includes("u0")),false);
 assert.deepEqual(h.calls,["director","writer:S1","reviewer:S1","writer:S2","reviewer:S2"]);
 assert.throws(()=>planWorkflow({...source,sourceRevision:"v2"},h.receipts),/STALE/);
 assert.throws(()=>planWorkflow(source,[{...h.receipts[0],status:"unknown"}]),/NO_AUTO_RETRY/);
});
