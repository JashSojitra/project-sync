/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader exercises the actual TS store. */
// Run the actual TypeScript store without adding a test framework or dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loadTypeScript = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replace(/(["'])@\//g, (_, quote) => quote + path.resolve(__dirname, '../src').replaceAll('\\', '/') + '/');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
};
require.extensions['.ts'] = loadTypeScript;
require.extensions['.tsx'] = loadTypeScript;
const { demo, getDemoState: state, getDemoMinute: now } = require('../src/lib/demo/store.ts');
const { liveGuards, siteStaffing } = require('../src/lib/demo/selectors.ts');
const { evaluateRequest, evaluateGuard } = require('../src/lib/matching/index.ts');
const { createSeed, CITY_HALL } = require('../src/lib/demo/seed.ts');

function pool() {
  const s = state(), r = s.requests[0], site = s.sites.find(x => x.id === r.siteId);
  return evaluateRequest(r, site, liveGuards(s, now()), now());
}
for (const scenario of ['surge', 'cancellation']) {
  demo.loadScenario(scenario);
  const requestId = state().requests[0].id, portalId = state().portalGuardId;
  const startingMinute = now();
  assert.equal(startingMinute, scenario === 'surge' ? 720 : 1050);
  assert.equal(state().opportunities.find(o => o.requestId).status, 'draft');
  assert.equal(demo.approve(requestId, pool().eligible[0].guardId).ok, false, 'approval requires acceptance');
  demo.setPortalOnline(true);
  demo.startMatching(requestId);
  const candidates = pool().eligible;
  assert(candidates.some(c => c.guardId === portalId), 'portal guard qualifies');
  assert(candidates.length >= (scenario === 'surge' ? 10 : 1));
  for (let i = 1; i < candidates.length; i++) assert(candidates[i - 1].etaMin <= candidates[i].etaMin, 'fastest arrival first');
  demo.sendOffers(requestId);
  const offerCount = state().opportunities.length;
  demo.sendOffers(requestId);
  assert.equal(state().opportunities.length, offerCount, 'sending twice cannot duplicate offers');
  assert.equal(demo.approve(requestId, portalId).ok, false, 'sent is not accepted');
  const offerId = state().opportunities.find(o => o.guardId === portalId).id;
  demo.respondToOpportunity(offerId, 'passed');
  assert.equal(demo.approve(requestId, portalId).ok, false, 'declined is not accepted');
  demo.restorePassedOpportunities();
  demo.respondToOpportunity(offerId, 'interested');
  assert.equal(state().requests[0].approvedGuardIds.length, 0, 'acceptance never changes coverage');
  assert(!state().shifts.some(sh => sh.guardId === portalId && sh.startMin < 1440), 'acceptance creates no assignment');
  demo.simulateResponses(requestId);
  assert.equal(state().requests[0].approvedGuardIds.length, 0, 'simulation never approves');
  assert.equal(demo.approve(requestId, portalId).ok, true);
  assert.equal(demo.approve(requestId, portalId).ok, false, 'duplicate approval blocked');
  if (scenario === 'surge') {
    for (const c of candidates.filter(c => c.guardId !== portalId).slice(0, 9)) assert.equal(demo.approve(requestId, c.guardId).ok, true);
  }
  const s = state(), r = s.requests[0], site = s.sites.find(x => x.id === r.siteId);
  assert.equal(r.status, 'resolved');
  assert.equal(new Set(r.approvedGuardIds).size, scenario === 'surge' ? 10 : 1);
  assert.equal(site.urgent, false);
  assert.equal(siteStaffing(site, liveGuards(s, now()), s.shifts, now()).open, 0);
  assert.equal(s.opportunities.find(o => o.id === offerId).status, 'confirmed');
  if (scenario === 'cancellation') {
    assert(s.shifts.some(sh => sh.guardId === 'g-jonah' && sh.status === 'cancelled'));
    assert.equal(s.shifts.filter(sh => sh.siteId === site.id && sh.status === 'scheduled').length, 1);
    assert(s.activity.some(e => e.text.startsWith('Shift recovered')));
  }
  for (const sh of s.shifts.filter(sh => sh.guardId && sh.status !== 'cancelled')) {
    assert(!s.shifts.some(other => other !== sh && other.guardId === sh.guardId && other.status !== 'cancelled' && other.startMin < sh.endMin && other.endMin > sh.startMin));
  }
  assert(s.activity.every(e => e.atMin >= startingMinute - 20 && e.atMin < startingMinute + 5));
  demo.reset();
  const normalized = { ...state(), toasts: [] };
  assert.deepEqual(normalized, createSeed(scenario, normalized.generation));
  assert.equal(now(), startingMinute);
  console.log(`${scenario}: full offer > response > individual approval > coverage > reset passed`);
}

for (const scenario of ['surge', 'cancellation']) {
  demo.loadScenario(scenario);
  const requestId = state().requests[0].id;
  const portalId = state().portalGuardId;
  const portalOffer = () => state().opportunities.find(o => o.requestId === requestId && o.guardId === portalId);
  demo.releasePortalOffer();
  assert.equal(portalOffer().status, 'draft', 'offline guard does not receive the demo offer');
  demo.setPortalOnline(true);
  demo.releasePortalOffer();
  assert.equal(portalOffer().status, 'open');
  assert.equal(demo.approve(requestId, portalId).ok, false, 'the incoming alert does not imply acceptance');
  assert.equal(demo.respondToOpportunity(portalOffer().id, 'interested').ok, true);
  demo.releasePortalOffer();
  assert.equal(portalOffer().status, 'interested', 'releasing again preserves the pending acceptance');
  assert.equal(state().requests[0].approvedGuardIds.length, 0);
  assert.equal(demo.approve(requestId, portalId).ok, true);
  assert.equal(portalOffer().status, 'confirmed');
}
console.log('Online scenario offer release and separate manager approval passed');

demo.loadScenario('surge');
demo.setPortalOnline(true);
demo.startMatching('r-surge');
demo.sendOffer('r-surge', state().portalGuardId);
demo.respondToOpportunity('op-surge', 'interested');
state().shifts.push({ id: 'test-conflict', siteId: 's-eastgate', guardId: state().portalGuardId, startMin: 840, endMin: 900, role: 'Conflict fixture', status: 'scheduled' });
assert(!pool().eligible.some(c => c.guardId === state().portalGuardId), 'matching excludes scheduled conflicts');
assert.equal(demo.approve('r-surge', state().portalGuardId).ok, false, 'approval rechecks scheduled conflicts');
demo.reset();
const s = state(), r = s.requests[0], site = s.sites.find(x => x.id === r.siteId);
for (const [patch, blocker] of [
  [{ licence: { status: 'expired', ref: '', expires: '' } }, 'licence'],
  [{ tier: 1 }, 'tier'], [{ certifications: [] }, 'training'], [{ uniforms: [] }, 'uniform'],
  [{ liveStatus: 'offline' }, 'availability'],
  [{ commitments: [{ startMin: 840, endMin: 900, label: 'conflict' }] }, 'conflicts'],
  [{ hoursThisWeek: 44 }, 'hours'],
]) {
  const guard = liveGuards(s, now()).find(g => g.id === s.portalGuardId);
  const result = evaluateGuard({ ...guard, liveStatus: 'available', ...patch }, r, site, now());
  assert(result.checks.some(c => c.id === blocker && !c.pass), `${blocker} enforced`);
}
const guard = liveGuards(s, now()).find(g => g.id === s.portalGuardId);
assert(!evaluateGuard({ ...guard, liveStatus: 'available' }, r, site, r.arriveByMin).eligible, 'late arrival blocked');
const positions = JSON.stringify(s.guards.map(g => g.position));
demo.setFocus({ ...CITY_HALL, source: 'gps', position: [-79, 44] });
assert.equal(JSON.stringify(state().guards.map(g => g.position)), positions, 'GPS never changes fictional guards');
demo.reset();
console.log('Eligibility, conflicts, duplicates, simulated clock, GPS isolation and exact reset passed');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { CommandCenterProvider } = require('../src/features/command-center/model.tsx');
const { RequestReviewPanel } = require('../src/features/command-center/panels/RequestsPanel.tsx');
function renderReview() {
  const s = state(), request = s.requests[0], site = s.sites.find(x => x.id === request.siteId);
  const guards = liveGuards(s, now());
  const model = { ...s, now: now(), guardById: new Map(guards.map(g => [g.id, g])), review: { request, site, pool: pool(), remaining: request.slots - request.approvedGuardIds.length }, select() {}, setHover() {} };
  return renderToStaticMarkup(React.createElement(CommandCenterProvider, { value: model }, React.createElement(RequestReviewPanel, { onClose() {} })));
}
demo.loadScenario('surge');
assert(renderReview().includes('Start intelligent matching'));
assert(!renderReview().includes('aria-label="Approve '));
demo.setPortalOnline(true);
demo.startMatching('r-surge');
demo.sendOffers('r-surge');
assert(renderReview().includes('Simulate'));
assert(!renderReview().includes('aria-label="Approve '), 'sent offers show no approval action');
demo.respondToOpportunity('op-surge', 'interested');
assert(renderReview().includes('aria-label="Approve Avery Quinn"'));
assert(renderReview().includes('Accepted - awaiting approval'));
demo.simulateResponses('r-surge');
const approvedIds = [state().portalGuardId, ...pool().eligible.filter(c => c.guardId !== state().portalGuardId).slice(0, 9).map(c => c.guardId)];
for (const id of approvedIds) demo.approve('r-surge', id);
assert(renderReview().includes('10/10 confirmed'));
demo.reset();
console.log('React request panels render matching, sent, pending approval and 10/10 completion states');

const { CHECKPOINTS } = require('../src/lib/demo/patrol.ts');
const { rosterCandidates, rosterConflict } = require('../src/lib/demo/roster.ts');
demo.loadScenario('surge');
const portalId = state().portalGuardId;
const portal = state().guards.find(g => g.id === portalId);

assert.equal(demo.startPatrol('unconfirmed'), undefined);
assert.equal(state().patrols.length, 0);
assert.equal(demo.approveOpportunity('op-eastgate').ok, false);
demo.setPortalOnline(true);
assert.equal(demo.respondToOpportunity('op-eastgate', 'interested').ok, true);
assert(!state().shifts.some(sh => sh.id === 'booking-op-eastgate'));
assert.equal(demo.approveOpportunity('op-eastgate').ok, true);
assert.equal(demo.approveOpportunity('op-eastgate').ok, false);
const booking = state().shifts.find(sh => sh.id === 'booking-op-eastgate');
assert.equal(booking.guardId, portalId);
demo.togglePreparation(booking.id, 'Read the post orders');
assert.deepEqual(state().preparation[booking.id], ['Read the post orders']);

demo.startPatrol(booking.id);
demo.startPatrol('sh-avery-tomorrow');
const patrolId = state().patrols[0].id;
assert.equal(state().patrols.length, 1, 'only one active patrol');
assert.equal(demo.verifyCheckpoint(patrolId, 'equipment', 'demo', 'SYNC:equipment').ok, false);
assert.equal(demo.verifyCheckpoint(patrolId, 'entrance', 'qr', 'SYNC:exit').ok, false);
for (const [i, checkpoint] of CHECKPOINTS.entries()) {
  assert.equal(state().patrols[0].status, 'active');
  const before = now();
  assert.equal(demo.verifyCheckpoint(patrolId, checkpoint.id, i === 0 ? 'qr' : 'demo', `SYNC:${checkpoint.id}`).ok, true);
  const verification = state().patrols[0].verifications[i];
  assert.equal(verification.status, 'verified');
  assert(verification.atMin > before);
  assert.equal(demo.verifyCheckpoint(patrolId, checkpoint.id, 'demo', `SYNC:${checkpoint.id}`).ok, false);
}
assert.equal(state().patrols[0].status, 'complete');
assert.equal(state().patrols[0].verifications[0].method, 'qr');
assert.equal(state().patrols[0].verifications[1].method, 'demo');

const first = state().roster[0];
const expectedCandidate = rosterCandidates(state(), first).find(c => !c.conflict);
demo.proposeRoster(-21, 9);
assert.equal(state().roster.find(row => row.id === first.id).guardId, expectedCandidate.guard.id);
assert(!state().roster.some(row => row.approved));
assert.equal(demo.publishRoster(-21, 9).ok, false);
assert.equal(demo.publishRoster(9, 40).ok, false);
assert(!state().shifts.some(row => row.id === first.id));

assert.equal(rosterConflict(state(), first, portal), null);
const unqualified = state().guards.find(g => !g.certifications.includes('access-control'));
assert.match(rosterConflict(state(), first, unqualified), /Needs|Licence/);
demo.assignRosterShift(first.id, portalId);
demo.approveRosterShift(first.id);
demo.setAvailability(2, 'unavailable');
assert.equal(state().roster.find(row => row.id === first.id).approved, false, 'changed availability invalidates approval');
assert.equal(rosterConflict(state(), first, portal), 'Marked unavailable');
demo.setAvailability(2, 'available');
demo.setWorkPreference('evening');
for (const row of state().roster) demo.approveRosterShift(row.id);
assert.equal(demo.publishRoster(-21, 9).ok, true);
assert.equal(state().shifts.find(row => row.id === first.id).guardId, portalId);
assert.equal(state().roster.length, 0);
assert.match(rosterConflict(state(), { ...first, id: 'different' }, portal), /Overlapping/);

const revised = { ...first, role: 'Updated reception relief' };
demo.saveRosterShift(revised);
const replacement = rosterCandidates(state(), revised).find(c => !c.conflict && c.guard.id !== portalId);
demo.assignRosterShift(first.id, replacement.guard.id);
assert.equal(state().shifts.find(row => row.id === first.id).guardId, portalId, 'published assignment remains while revision is pending');
demo.approveRosterShift(first.id);
assert.equal(demo.publishRoster(-21, 9).ok, true);
assert.equal(state().shifts.filter(row => row.id === first.id).length, 1);
assert.equal(state().shifts.find(row => row.id === first.id).guardId, replacement.guard.id);
assert.equal(state().shifts.find(row => row.id === first.id).role, revised.role);

demo.reviewApplication('approved');
assert.equal(state().application, null);
demo.submitApplication('Google');
assert.equal(state().application.status, 'pending');
demo.reviewApplication('rejected');
assert.equal(state().application.status, 'rejected');
demo.submitApplication('Microsoft');
demo.reviewApplication('approved');
assert.deepEqual(state().application, { provider: 'Microsoft', status: 'approved' });
demo.reset();
assert.deepEqual(state().roster, createSeed().roster);
assert.equal(state().application, null);
assert.equal(state().workPreference, 'any');
assert.deepEqual(state().patrols, []);
assert.deepEqual(state().preparation, {});
console.log('Opportunity approval, Mission preparation, patrol order/method/completion, roster validation/publication/revision, onboarding and reset passed');
