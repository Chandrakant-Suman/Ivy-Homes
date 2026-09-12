// analyzeData.js
// -----------------------------------------------------------------------------
// One script that (1) logs in, (2) pages the whole dataset, (3) computes the ten
// answers, (4) lists the documentation discrepancies it can reproduce, prints
// everything, and (5) writes ../../submission.json.
//
// Run from the server/ directory:
//     IVY_DEMO_EMAIL=demo1@ivy.homes IVY_DEMO_PASSWORD=... node scripts/analyzeData.js
// or pass them as args:
//     node scripts/analyzeData.js demo1@ivy.homes <password>
//
// The API key comes from server/.env (IVY_API_KEY); the demo password is never
// stored in the repo.
// -----------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../utils/config.js';
import { isCorrupt, corruptReason, isSqm, carpetSqft, buildFakeSet, SQFT_PER_SQM } from '../utils/detect.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATA_DIR = path.resolve(__dirname, '../data');

const EMAIL = process.env.IVY_DEMO_EMAIL || process.argv[2] || 'demo1@ivy.homes';
const PASSWORD = process.env.IVY_DEMO_PASSWORD || process.argv[3];
const BASE = config.baseUrl;
const KEY = config.apiKey;

const REFERENCE = new Date('2026-09-10T00:00:00+05:30');

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`login failed (${r.status}): ${await r.text()}`);
  return (await r.json()).access_token;
}

async function crawl(collection, token) {
  const limit = 50;
  let offset = 0;
  const all = [];
  let reportedTotal = null;
  for (let guard = 0; guard < 500; guard++) {
    const r = await fetch(`${BASE}/v1/${collection}?limit=${limit}&offset=${offset}`, {
      headers: { 'X-API-Key': KEY, Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    reportedTotal = j.total;
    all.push(...j.results);
    if (!j.has_more || j.results.length === 0) break;
    offset += j.results.length;
  }
  return { records: all, reportedTotal };
}

// ---- Q2: distinct physical properties -------------------------------------
// Two records are the same unit when they share building/locality/bedroom/
// bathroom/floor/total_floors AND sit at essentially the same coordinates.
// (Coordinates alone merge different flats in one tower; attributes alone merge
// far-apart plots that share bedroom=0/floor=0.)
function countUniqueProperties(listings) {
  const groups = new Map();
  for (const x of listings) {
    const k = [x.apartment_name, x.locality, x.bedroom, x.bathroom, x.floor, x.total_floors].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  let unique = 0;
  for (const recs of groups.values()) {
    const used = new Array(recs.length).fill(false);
    for (let i = 0; i < recs.length; i++) {
      if (used[i]) continue;
      unique++;
      used[i] = true;
      for (let j = i + 1; j < recs.length; j++) {
        if (
          !used[j] &&
          Math.abs(recs[i].latitude - recs[j].latitude) < 0.01 &&
          Math.abs(recs[i].longitude - recs[j].longitude) < 0.01
        )
          used[j] = true;
      }
    }
  }
  return unique;
}

// duplicate (second-copy) ids, for evidence in the findings
function duplicateIds(listings) {
  const groups = new Map();
  for (const x of listings) {
    const k = [x.apartment_name, x.locality, x.bedroom, x.bathroom, x.floor, x.total_floors].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const extra = [];
  for (const recs of groups.values()) {
    if (recs.length < 2) continue;
    const used = new Array(recs.length).fill(false);
    for (let i = 0; i < recs.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      for (let j = i + 1; j < recs.length; j++) {
        if (
          !used[j] &&
          Math.abs(recs[i].latitude - recs[j].latitude) < 0.01 &&
          Math.abs(recs[i].longitude - recs[j].longitude) < 0.01
        ) {
          used[j] = true;
          extra.push(recs[j].listing_id);
        }
      }
    }
  }
  return extra;
}

// ---- Q8: posted in the 7 days before REFERENCE, in IST --------------------
// posted_at is stamped with a UTC 'Z', but the service's own clock (/health) is
// IST (+05:30) and the reference window is IST, so the wall-clock value is IST.
// Comparing the naive wall clock to the IST window is therefore correct.
function postedLast7Days(listings) {
  const start = '2026-09-03T00:00:00';
  const end = '2026-09-10T00:00:00';
  return listings.filter((x) => {
    const s = x.posted_at.replace('Z', '').slice(0, 19);
    return s >= start && s < end;
  }).length;
}

function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeAnswers(listings, rentals, projects) {
  // Q4 corrupt
  const corrupt = listings.filter(isCorrupt);
  const corruptIds = corrupt.map((x) => x.listing_id).sort();

  // Q9 fake
  const { fakeIds, fakePhones } = buildFakeSet(listings);
  const fakeIdsSorted = [...fakeIds].sort();

  // Q6 avg price/sqft for live 2BHK, excluding corrupt + fake, sqm normalised
  const corruptSet = new Set(corruptIds);
  const q6 = listings.filter(
    (x) => x.bedroom === 2 && x.is_live && !corruptSet.has(x.listing_id) && !fakeIds.has(x.listing_id)
  );
  const ppsf = q6.map((x) => x.price / carpetSqft(x));
  const avgPpsf = Math.round(mean(ppsf) * 100) / 100;

  // Q5 total monthly rent in Kukatpally
  const rentKukatpally = rentals
    .filter((r) => r.locality === 'kukatpally')
    .reduce((a, r) => a + r.price, 0);

  // Q7 costliest project (highest price_max; values are crore -> INR)
  const costliest = [...projects].sort((a, b) => b.price_max - a.price_max)[0];

  // Q10 projects whose reported total_listings != actual live listings
  const liveByProject = new Map();
  for (const l of listings) {
    if (l.project_id && l.is_live) liveByProject.set(l.project_id, (liveByProject.get(l.project_id) || 0) + 1);
  }
  const wrongProjects = projects.filter(
    (p) => p.total_listings !== (liveByProject.get(p.project_id) || 0)
  );

  return {
    answers: {
      total_listing_records: listings.length,
      unique_properties: countUniqueProperties(listings),
      active_listings: listings.filter((x) => x.is_live === true).length,
      corrupt_listing_ids: corruptIds,
      total_monthly_rent: rentKukatpally,
      avg_price_per_sqft_2bhk: avgPpsf,
      costliest_project: {
        project_id: costliest.project_id,
        price_max_inr: Math.round(costliest.price_max * 1e7),
      },
      listings_last_7_days: postedLast7Days(listings),
      fake_listing_ids: fakeIdsSorted,
      projects_with_wrong_listing_count: wrongProjects.length,
    },
    extra: { corrupt, fakePhones, fakeIds, wrongProjects },
  };
}

// ---- Part 3: findings (all reproduced from the crawl) ---------------------
function buildFindings(listings, projects, extra) {
  const sqmIds = listings.filter(isSqm).map((x) => x.listing_id).slice(0, 20);
  const notLiveIds = listings.filter((x) => !x.is_live).map((x) => x.listing_id).slice(0, 20);
  const corruptIds = extra.corrupt.map((x) => x.listing_id).sort().slice(0, 20);
  const fakePhones = [...extra.fakePhones].slice(0, 20);
  const wrongProjIds = extra.wrongProjects.map((p) => p.project_id).slice(0, 20);
  const dupIds = duplicateIds(listings).slice(0, 20);
  const cheapProjects = projects.filter((p) => p.price_min > p.price_max).map((p) => p.project_id).slice(0, 20);

  return [
    {
      endpoint: '*',
      category: 'auth',
      documented: 'API key is sent as a query parameter, e.g. GET /v1/listings?api_key=IVY26-...',
      actual: "the key must be sent as the X-API-Key request header; the query param is rejected with 'send your key in the X-API-Key request header, not as a query parameter'",
      how_found: 'called an endpoint with ?api_key=... and got a 400 telling me to use the header',
      impact: 'every request fails if you follow the documented auth scheme',
      evidence: [],
    },
    {
      endpoint: '/auth/login',
      category: 'auth',
      documented: 'response is { token, token_type, expires_in: 86400, user:{email,name} }; tokens last 24h; there is no refresh flow',
      actual: 'response is { access_token, refresh_token, token_type, expires_in: 900, refresh_url:"/auth/refresh", user:{email} }; the access token lasts 15 minutes and a refresh flow exists',
      how_found: 'logged in and inspected the JSON',
      impact: 'a client that reads `token` or assumes a 24h session breaks; you must refresh every 15 min to stay logged in',
      evidence: [],
    },
    {
      endpoint: '/auth/logout',
      category: 'auth',
      documented: 'invalidates the current token server side',
      actual: 'logout is stateless: it returns {ok, note:"tokens are stateless; discard them client side"} and the same access token still returns 200 afterwards',
      how_found: 'called /auth/logout, then reused the same token against /v1/saved and got 200',
      impact: 'logging out does not revoke access; a leaked token stays valid until it expires',
      evidence: [],
    },
    {
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: 'paginate with `page` (1-indexed) and `limit` (max 200); response is { total, page, page_size, results }',
      actual: 'pagination is by `limit`/`offset`; `page` is silently ignored; `limit` is capped at 50; response is { limit, offset, count, total, has_more, results }',
      how_found: 'page=2 returned the same rows as offset=0; limit=200 came back as limit=50; offset paging works',
      impact: 'a page-based client re-reads page 1 forever and never advances',
      evidence: [],
    },
    {
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: '`total` is the exact number of matching records; to fetch everything, read total and request total/limit pages',
      actual: '`total` is understated (4178) while paging by has_more yields 4400 distinct records; the documented method drops ~222 listings',
      how_found: 'paged until has_more=false and counted 4400 distinct ids vs the reported total of 4178',
      impact: 'trusting `total` silently truncates the dataset (~5% of listings missing)',
      evidence: [],
    },
    {
      endpoint: '/v1/listings',
      category: 'sorting',
      documented: '`order` accepts asc (default) or desc',
      actual: '`order` is ignored; results are always ascending by `sort_by` (asc and desc return identical pages)',
      how_found: 'compared sort_by=price&order=asc vs sort_by=price&order=desc — byte-identical',
      impact: 'you cannot get descending order from the API; must sort client side',
      evidence: [],
    },
    {
      endpoint: '/v1/listings',
      category: 'filters',
      documented: 'the projects section states GET /v1/listings?project_id=... returns that project\'s listings',
      actual: '`project_id` is not an applied filter; the request returns the full unfiltered list (total 4178)',
      how_found: 'requested ?project_id=P20173 and got all 4178 records back',
      impact: 'you cannot fetch a project\'s listings through the listings endpoint',
      evidence: [],
    },
    {
      endpoint: '/v1/listings',
      category: 'units',
      documented: 'area is in square feet, integer, everywhere in the API',
      actual: 'a subset of listings report carpet_area and super_built_up_area in square METRES (e.g. a 3 BHK with carpet_area 105); they form a clean sub-200 cluster while real sqft values start above ~400',
      how_found: 'carpet-area distribution is bimodal with an empty 200–400 gap for 2/3 BHK; the metric records keep the same super/carpet ratio, so both fields are metric',
      impact: 'price-per-sqft and area filters are ~10.76x wrong for these records',
      evidence: sqmIds,
    },
    {
      endpoint: '/v1/projects',
      category: 'units',
      documented: 'price_min and price_max are in rupees',
      actual: 'price_min/price_max are small numbers in [1, 99.9] (crore, i.e. x1e7 rupees); also price_min > price_max for 348/446 projects, so the min/max labels are unreliable',
      how_found: 'scanned all 446 projects; values never exceed 99.9 and min > max most of the time',
      impact: 'reading them as rupees is off by seven orders of magnitude; a price range cannot be trusted',
      evidence: cheapProjects,
    },
    {
      endpoint: '/v1/listings',
      category: 'data_quality',
      documented: 'each record describes a real listing and "anything this endpoint returns is safe to show to a user"',
      actual: '30 listings are physically impossible: 10 with a negative price, 10 with floor > total_floors, 10 with carpet_area > super_built_up_area',
      how_found: 'checked these invariants across the full crawl',
      impact: 'impossible records reach the UI and corrupt any aggregate that includes them',
      evidence: corruptIds,
    },
    {
      endpoint: '/v1/listings',
      category: 'fraud',
      documented: 'posted_by_contact is the seller\'s verified contact number; is_verified means our operations team checked the listing',
      actual: '261 listings come from 12 phone numbers that each post under several different seller names (invented agencies + rotating personal names) and are systematically under-priced (median ~₹6.6k/sqft vs ~₹9.9k) to farm enquiries; most are flagged is_verified=true',
      how_found: 'grouped listings by phone number; exactly 12 numbers map to more than one seller name, and their price-per-sqft sits well below the market',
      impact: 'enquiry-bait fraud is shown to users as verified inventory',
      evidence: fakePhones,
    },
    {
      endpoint: '/v1/listings',
      category: 'duplicates',
      documented: 'every listing_id is globally unique and each listing corresponds to exactly one physical property',
      actual: 'about 145 listings are second copies of the same physical unit cross-posted on another website (same building/locality/bedroom/bathroom/floor and near-identical coordinates), so 4400 records describe roughly 4255 properties',
      how_found: 'clustered records by physical attributes plus coordinate proximity',
      impact: 'property counts and "similar" strips double-count the same flat',
      evidence: dupIds,
    },
    {
      endpoint: '/v1/listings',
      category: 'completeness',
      documented: 'returns only active listings; inactive, expired and withdrawn are excluded, so anything returned is safe to show',
      actual: '923 of 4400 listings have is_live=false and are still returned; the is_live field itself is undocumented',
      how_found: 'counted is_live across the crawl',
      impact: 'withdrawn/inactive listings are served and shown as if active',
      evidence: notLiveIds,
    },
    {
      endpoint: '/v1/listing/{id}',
      category: 'missing_endpoint',
      documented: 'GET /v1/listing/{listing_id} returns a single listing',
      actual: 'that path 404s; the working path is the plural GET /v1/listings/{id}',
      how_found: 'requested both the singular and plural paths',
      impact: 'a detail page built to the docs 404s on every listing',
      evidence: [],
    },
    {
      endpoint: '/v1/listings/{id}/similar',
      category: 'missing_endpoint',
      documented: 'returns up to ten comparable listings for a "you may also like" strip',
      actual: 'no similar endpoint exists at any path (all variants 404)',
      how_found: 'requested the documented path and several plausible variants — all 404',
      impact: 'there is no comparable-listings data from the API; it must be computed client side',
      evidence: [],
    },
    {
      endpoint: '/v1/favourites',
      category: 'missing_endpoint',
      documented: 'GET/POST/DELETE /v1/favourites, POST body { id }',
      actual: '/v1/favourites 404s; the real endpoint is /v1/saved and POST expects { listing_id }',
      how_found: 'requested /v1/favourites (404), then probed and found /v1/saved',
      impact: 'the favourites feature is broken end-to-end if built to the docs',
      evidence: [],
    },
    {
      endpoint: '/v1/saved',
      category: 'undocumented_endpoint',
      documented: 'not mentioned anywhere in the reference',
      actual: 'exists and is the real favourites API: GET /v1/saved -> {count, results}, POST {listing_id} -> {ok, listing_id, saved_count}, DELETE /v1/saved/{listing_id}',
      how_found: 'probed saved-listing paths after /v1/favourites 404\'d',
      impact: 'the working favourites API is entirely undocumented',
      evidence: [],
    },
    {
      endpoint: '/v1/analytics/summary',
      category: 'missing_endpoint',
      documented: 'returns pre-computed city aggregates for a dashboard',
      actual: 'the path 404s; no analytics endpoint exists at any variant',
      how_found: 'requested /v1/analytics/summary and variants (/v1/insights/summary, /v1/stats, ...) — all 404',
      impact: 'the insights screen must compute every aggregate itself from the crawl',
      evidence: [],
    },
    {
      endpoint: '/v1/projects',
      category: 'consistency',
      documented: 'total_listings is recomputed on every change and always agrees with GET /v1/listings?project_id=...',
      actual: 'total_listings disagrees with the actual live-listing count for 129 projects; and since project_id is ignored, the documented cross-check cannot even be run',
      how_found: 'counted listings per project_id from the crawl and compared to each project\'s total_listings',
      impact: 'project listing counts cannot be trusted',
      evidence: wrongProjIds,
    },
    {
      endpoint: '*',
      category: 'timestamps',
      documented: 'timestamps are ISO 8601 in UTC with a Z suffix, everywhere in the API',
      actual: 'the service reports its own clock in IST (+05:30 in /health and reference_date), while record timestamps carry a UTC Z; the record wall-clock values line up with the IST reference, so the Z is a mislabel and they must be read as IST',
      how_found: 'compared the +05:30 clock in /health against the Z-suffixed posted_at values when counting the 7-day IST window',
      impact: 'treating posted_at as true UTC shifts every record 5h30m and miscounts date-window queries',
      evidence: [],
    },
  ];
}

async function main() {
  if (!PASSWORD) {
    console.error('Missing demo password. Pass it via IVY_DEMO_PASSWORD env var or as the 2nd CLI arg.');
    console.error('  node scripts/analyzeData.js demo1@ivy.homes <password>');
    process.exit(1);
  }
  console.log('Logging in as', EMAIL, '...');
  const token = await login();

  console.log('Crawling listings / rentals / projects (paging by has_more)...');
  const L = await crawl('listings', token);
  const R = await crawl('rentals', token);
  const P = await crawl('projects', token);
  console.log(`  listings: ${L.records.length} (reported total ${L.reportedTotal})`);
  console.log(`  rentals:  ${R.records.length} (reported total ${R.reportedTotal})`);
  console.log(`  projects: ${P.records.length} (reported total ${P.reportedTotal})`);

  // cache the raw crawl (gitignored) for reference
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, 'cache.json'),
    JSON.stringify({ listings: L.records, rentals: R.records, projects: P.records }, null, 0)
  );

  const { answers, extra } = computeAnswers(L.records, R.records, P.records);
  const findings = buildFindings(L.records, P.records, extra);

  console.log('\n=== ANSWERS ===');
  console.log(JSON.stringify(answers, null, 2));
  console.log(`\ncorrupt: ${answers.corrupt_listing_ids.length}, fake: ${answers.fake_listing_ids.length}, findings: ${findings.length}`);

  const submission = {
    api_key: KEY,
    candidate: {
      name: 'Chandrakant Suman',
      email: 'chandrakant.20233106@mnnit.ac.in',
      repo_url: '',
      demo_url: '',
    },
    answers,
    findings,
  };

  const outPath = path.join(ROOT, 'submission.json');
  fs.writeFileSync(outPath, JSON.stringify(submission, null, 2) + '\n');
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
