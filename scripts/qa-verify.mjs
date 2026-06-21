import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const MINHANH = "cmqicbc630003mrgmu223skte";
const slugs = ["qa-internal-bao-cao-noi-bo","qa-restricted-quy-gia-an","qa-restricted-nhom-khac","qa-attachments-vcb"];
const reps = Object.fromEntries(await Promise.all(slugs.map(async s => [s, await p.report.findUniqueOrThrow({where:{slug:s}})])));
const VCB = (await p.symbol.findUniqueOrThrow({where:{ticker:"VCB"},select:{id:true}})).id;
// replicate the NEW visibleWhere (incl. audience:CLIENT)
const visible = (uid) => ({ status:"PUBLISHED", audience:"CLIENT", OR:[
  {accessLevel:"PUBLIC"},
  {entitlements:{some:{group:{members:{some:{userId:uid}}}}}},
  {category:{entitlements:{some:{group:{members:{some:{userId:uid}}}}}}},
]});
const sees = async (uid, r) => (await p.report.count({where:{id:r.id, ...visible(uid)}})) === 1;
const ok = (l,g,w)=>console.log(`${g===w?"✅":"❌"} ${l}: got=${g} want=${w}`);
console.log("── minhanh visibility (real predicate w/ audience fix) ──");
ok("INTERNAL hidden", await sees(MINHANH, reps["qa-internal-bao-cao-noi-bo"]), false);
ok("RESTRICTED+her-group visible", await sees(MINHANH, reps["qa-restricted-quy-gia-an"]), true);
ok("RESTRICTED+other-group hidden", await sees(MINHANH, reps["qa-restricted-nhom-khac"]), false);
ok("PUBLIC visible", await sees(MINHANH, reps["qa-attachments-vcb"]), true);
// staff: all published visible (no audience filter for staff)
ok("staff sees INTERNAL (count PUBLISHED)", (await p.report.count({where:{id:reps["qa-internal-bao-cao-noi-bo"].id, status:"PUBLISHED"}}))===1, true);
console.log("── F2 fan-out user-filter (replicated incl. INTERNAL guard) ──");
const watchersFor = async (r) => {
  if (r.audience === "INTERNAL") return 0; // the new guard
  const entitled = r.accessLevel === "PUBLIC" ? {} : { OR:[{role:{in:["SUPER_ADMIN","APPROVER","EDITOR"]}},{memberships:{some:{group:{entitlements:{some:{OR:[{reportId:r.id},{categoryId:r.categoryId}]}}}}}}] };
  return p.user.count({ where:{ status:"APPROVED", watchlistEmails:true, watchlistItems:{some:{symbolId:{in:[VCB]}}}, notifications:{none:{reportId:r.id, channel:"EMAIL"}}, ...entitled } });
};
ok("VCB PUBLIC report → ≥1 watcher (minhanh)", (await watchersFor(reps["qa-attachments-vcb"]))>=1, true);
ok("INTERNAL report → 0 watchers", await watchersFor(reps["qa-internal-bao-cao-noi-bo"]), 0);
console.log("── attachments (real listReportAttachments logic) ──");
const att = reps["qa-attachments-vcb"];
ok("client sees CLIENT-only", await p.reportAttachment.count({where:{reportId:att.id, audience:"CLIENT"}}), 1);
ok("staff sees all", await p.reportAttachment.count({where:{reportId:att.id}}), 2);
await p.$disconnect();
