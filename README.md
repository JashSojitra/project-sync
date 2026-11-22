# SYNC: Every shift. In sync.

Mobile-first security workforce orchestration. A manager dispatch map and a guard app that share one
live demo state. Built as an interactive prototype for the Brampton AI Hackathon, Challenge 10.

**Public geography is real; everything else is fictional.** Guards, clients, sites, licences, assignments and
scenarios are invented. Brampton City Hall is used only as the presentation venue and starting location; it is
not presented as a client site. Arrival times are illustrative estimates from a simple distance model, not
live traffic. Demo state is in memory and the applicant sign-in screen is simulated. No external API keys are required.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 (copies the MapLibre worker into public/vendor first)
npx next typegen   # generates framework route types on a fresh checkout
npm run typecheck
npm run lint
npm run build
```

| Route       | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `/`         | Landing page: "The city responds" 3D hero (Canvas 2D), then Plan / Dispatch / Prepare |
| `/dispatch` | Manager dispatch: map, bottom sheet, Requests / Schedule / Profile          |
| `/guard`    | Guard app with Home, Opportunities, Schedule, Patrol and Profile                       |

Demo switches (useful on a flaky venue network):

- `/dispatch?basemap=offline`: hides street tiles, shows the local schematic grid; positions stay live
- `/dispatch?map=svg`, `/guard?map=svg`: force the no-WebGL SVG map
- `/?hero=static`: landing hero renders its final frame once, no animation (also automatic with reduced
  motion, Save-Data, or two or fewer CPU cores)

## Demo script

**Use one tab and the in-app links to switch views.** State is held in memory, survives client navigation, and resets on refresh. Separate tabs, browsers and devices do not synchronize.

**Scenario A (12:00): a client requests 10 extra guards for 2 PM**

1. Open `/guard`, turn **Available for shifts** on, then use **Dispatch view**.
2. Open the orange **10 extra guards for 2 PM** request (on mobile, tap **Requests** in the bottom navigation).
3. Tap **Start intelligent matching**. Inspect ranked map markers and expand a candidate for all eight eligibility checks. Fastest illustrative arrival comes first, then reliability. Licence, tier, training, uniform, online availability, arrival deadline, commitments and scheduled conflicts, and hours are checked.
4. Tap **Send N simulated offers**, or send an individual **Offer**. No assignment exists yet.
5. Tap **Open Avery's Guard app**, open **Opportunities**, then accept the urgent offer with the button or a right swipe. **Awaiting approval** appears; coverage is still zero. Passing an offer records a decline. Show passed offers to retry it.
6. Return through **Dispatch view**. Tap **Simulate N guard responses** for the other fictional guards. Avery is never auto-accepted by the simulation.
7. Tap **Approve** beside Avery and nine other accepted candidates, individually. The request reaches **10/10 confirmed**, the site has 14/14 guards assigned, and every approval appears in timestamped activity. There is no bulk or automatic approval.
8. Switch to Guard, open the newly confirmed shift's **Mission** button, review the entrance, Post Orders and readiness checklist. **Open site directions** opens an external map. The Call control is simulated.

**Scenario B (17:30): a guard cancels a 6 PM shift**

1. In manager **Profile**, select **Late cancellation** (desktop: B in the top bar). Loading a scenario replaces the previous scenario with its exact seed.
2. The cancelled Jonah assignment is retained in the roster, the replacement post is unassigned, and Fletcher's Creek is orange/uncovered.
3. Open Guard and go online, return to the rescue request, start matching and send Avery an individual offer. Nearby eligible guards are ranked on the map; late arrivals are excluded.
4. Open **Opportunities** and accept in Guard, return to Dispatch and explicitly approve Avery. Only then does **Shift recovered** appear and site coverage return to 1/1. Other replacements can also respond through the deterministic simulation.

**Location:** tap the header location for the City Hall preset at 2 Wellington Street West, Brampton, Ontario, Canada; search the bundled venue/address list; tap a point on the map; or request browser geolocation. No network search or GPS is required. Permission denial, timeout and unavailable location have manual alternatives. GPS is kept separately from fictional guard positions, in memory until reset. City Hall is a presentation venue, never a client site.

**Reset demo** (desktop top bar, manager Profile, guard Profile) restores the current scenario, clock, offers, assignments, activity, roster drafts, patrol progress, preparation checklists, availability preferences and onboarding review state. No delayed simulated responses can leak into another scenario. Event timestamps advance one simulated second per workflow event; waiting does not consume the rescue window. The online-session duration counter alone uses elapsed real time.

**Patrol after Scenario A or B**

1. In Guard Home, open **Mission** for the confirmed assignment, then tap **Open SYNC Patrol** and **Start demo patrol**. The same assignment is available from the Patrol tab.
2. Guided Patrol highlights the current checkpoint and shows directions and the next stop. Select a numbered checkpoint below the floor plan to inspect its instructions.
3. Verify **Main Entrance**, **Security Reception**, **East Corridor**, **Equipment Room**, and **Rear Exit**, in that order. Use **Simulate checkpoint** for the fastest demo. Switch to **Quick tap** for a one-handed layout.
4. To demonstrate QR, print the codes in `public/checkpoints/` or open the current code on a second screen. Choose **Scan QR from a camera photo or image** and capture or upload the code. The browser decodes it locally. The scan rejects a code for a different checkpoint. On Web NFC browsers in a secure context, the optional NFC button reads an NDEF text tag with the same `SYNC:<checkpoint-id>` value.
5. In Dispatch, open **Profile → Patrol monitor** to see the guard, site, remaining stops, and timestamps and methods. **Patrol complete** appears only after all five checks.

**Monthly roster**

1. In Guard **Schedule**, select November 24 and set availability and preferred working times. Select **Next month** to inspect December, then return.
2. Open Dispatch **Schedule → Generate monthly proposal**. Two fictional November drafts are seeded. The manager sees Avery's preference for the selected day. Candidate ranking uses estimated drive time first, then preferred working time and reliability for ties.
3. Select **Nov 24**, choose Avery for **Reception relief**, and tap **Approve assignment**. Select **Nov 26**, review the guard selected for **Gate patrol**, and approve individually. An unavailable date, missing qualification, expired licence, missing uniform, or overlap blocks assignment. Existing seeded dispatch records are shown alongside roster work. To add a shift, select a future day and use **Create shift**.
4. Tap **Publish approved roster**, then open Guard **Schedule → November 24** and verify the published shift. **Revise published shift** stages a change. The current assignment stays visible until the manager approves the revision and republishes it.

**Standalone opportunity and onboarding**

- With Avery online and free, accept the Eastgate offer under **Opportunities**. In Dispatch **Requests → Accepted opportunities**, tap **Approve opportunity**. The assignment appears in Guard Schedule on November 23 after approval.
- In Guard **Profile → Guard application preview**, pick the Google or Microsoft sign-in concept and submit Riley West's fictional application. In Dispatch **Profile → Guard onboarding review**, approve or reject. Approval unlocks Riley's orientation text in the guard preview. Avery is an established demo guard and remains available for both official scenarios. New assignments still need separate approval.
- Dispatch **Profile** also contains the fictional guard and site directories. Licence expiry, qualification and uniform metadata, contacts, Post Orders and the shared rehearsal floor plan are inspectable there.

## Validation

```bash
npx next typegen
npm run typecheck
npm run test:demo
npm run lint
npm run build
```

The demo suite covers both complete dispatch scenarios, arrival-first ranking, explicit approval, declined and duplicate offers, coverage, cancelled records, deterministic time and reset. It also exercises standalone approval, Mission checklist persistence, ordered patrol verification and method tracking, roster generation, approval and publication, revisions, and onboarding review.

All routes share an in-browser demo store. Checkpoint QR is decoded from an image on the device. The NFC button depends on browser support and physical tags. Simulated checks are marked in patrol history. The floor plan is fictional and provides diagram-based guidance. No indoor localization, AR, OAuth, or production scheduling service is involved.

## Architecture

```
src/
  app/                       routes: / (landing), /dispatch, /guard
  lib/
    demo/types.ts            domain model (Guard, Site, StaffingRequest, Shift, ShiftOpportunity, FocusLocation)
    demo/seed.ts             deterministic Brampton seed for both scenarios
    demo/store.ts            external store + demo clock; offer/response/individual approval actions re-validate eligibility
    demo/selectors.ts        clock-aware derivations (en-route interpolation, staffing incl. scheduled)
    matching/index.ts        eligibility checks first, then ranking by est. arrival and reliability
    motion.ts                spring tokens, momentum projection, rubber-banding, haptics
  features/
    command-center/          dispatch map (MapLibre), markers, clustering, sheet, panels, location picker
    guard-portal/            guard app tabs, swipe deck, nearby map, assignment calendar
    mission/                 Mission Mode briefing
    patrol/                  Guided floor plan, Quick Tap and checkpoint verification
    scheduling/              Monthly roster, assignment approval and publication
    landing/                 landing page; city/ = hero world (procedural Brampton, real matching engine)
                             and Canvas 2D perspective renderer with cached light layers
```

**Map:** MapLibre GL + OpenFreeMap vector tiles (open data, no key), restyled to the SYNC palette.
Attribution for OpenFreeMap, OpenMapTiles and OpenStreetMap is shown in the UI.

**Motion:** critically damped springs by default; bounce only after a flick. The sheet and swipe cards track the
finger 1:1, rubber-band at their limits, project release velocity to choose a snap, and hand that velocity to the
settling spring. `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast` are respected.
