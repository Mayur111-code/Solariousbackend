import assert from "node:assert/strict";
import test from "node:test";
import {buildEnquiryReport,csvCell} from "./enquiry-report.mjs";

test("CSV output escapes formulas, quotes and commas",()=>{
  assert.equal(csvCell("=SUM(A1:A2)"),'"\'=SUM(A1:A2)"');
  assert.equal(csvCell('Acme, "Solar"'),'"Acme, ""Solar"""');
});

test("weekly report uses exact items and distinguishes quote sources",()=>{
  const start=new Date("2026-01-01T00:00:00.000Z"),end=new Date("2026-01-08T00:00:00.000Z"),items=[{kind:"contact",name:"A",phone:"1",email:"a@example.com",product:"TOPCon",status:"new",createdAt:start},{kind:"quote",name:"B",phone:"2",email:"b@example.com",message:"Factory",status:"contacted",createdAt:end}];
  const report=buildEnquiryReport({items,start,end});
  assert.deepEqual(report.counts,{total:2,contact:1,quote:1,new:1,contacted:1,pending:1});
  assert.match(report.html,/Weekly Customer Enquiry Summary/);
  assert.match(report.csv,/"Quote"/);
});
