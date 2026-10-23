// Generates a properly formatted Word (.docx) version of the metrics report.
// Run: npm run docx   (from the tools/ folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak, TabStopType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'METRICS-REPORT.docx');

// ---- palette (matches the app's "Cinema at Night" theme) ----
const VIOLET = '5736D6';
const INK = '171826';
const MUTED = '6B6F8A';
const HEADER_BG = '2E2170';
const ZEBRA = 'F3F2FB';
const LINE = 'D8DAEA';

const FONT = 'Calibri';
const HEAD_FONT = 'Calibri';

// ---- small builders ----
const txt = (text, opts = {}) => new TextRun({ text, font: FONT, ...opts });

const para = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [typeof children === 'string' ? txt(children) : children],
    spacing: { after: 140, line: 276 },
    ...opts,
  });

const body = (text) => para([txt(text, { size: 21, color: INK })]);

const bullet = (runs) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [txt(runs, { size: 21, color: INK })],
    bullet: { level: 0 },
    spacing: { after: 80, line: 276 },
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, font: HEAD_FONT, bold: true, size: 30, color: VIOLET })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: HEAD_FONT, bold: true, size: 25, color: INK })],
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, font: HEAD_FONT, bold: true, size: 22, color: MUTED })],
  });

// Monospace "code / formula" block with light shading.
const code = (lines) =>
  (Array.isArray(lines) ? lines : lines.split('\n')).map(
    (l, i, arr) =>
      new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: 'F4F4F8' },
        spacing: { after: i === arr.length - 1 ? 140 : 0, line: 260 },
        children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 19, color: '2A2C44' })],
      })
  );

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };

function cell(content, { header = false, align = AlignmentType.LEFT, fill } = {}) {
  const runs = (Array.isArray(content) ? content : [content]).map((c) =>
    typeof c === 'string'
      ? new TextRun({ text: c, font: FONT, size: 19, bold: header, color: header ? 'FFFFFF' : INK })
      : c
  );
  return new TableCell({
    width: { size: 0, type: WidthType.AUTO },
    shading: header ? { type: ShadingType.CLEAR, fill: HEADER_BG } : fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: align, children: runs })],
  });
}

// Build a table from a header row + data rows. `aligns` optional per-column.
function table(headers, rows, aligns = []) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { header: true, align: aligns[i] || AlignmentType.LEFT })),
  });
  const dataRows = rows.map((r, ri) =>
    new TableRow({
      children: r.map((c, ci) =>
        cell(c, { align: aligns[ci] || AlignmentType.LEFT, fill: ri % 2 === 1 ? ZEBRA : undefined })
      ),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideHorizontal: thinBorder, insideVertical: thinBorder },
    rows: [headerRow, ...dataRows],
  });
}

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [txt('')] });
const R = AlignmentType.RIGHT, C = AlignmentType.CENTER;

// ====================================================================
// Document content
// ====================================================================
const children = [];

// ---- Title block ----
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1400, after: 60 },
    children: [new TextRun({ text: '🎬 CurtainCall', font: HEAD_FONT, bold: true, size: 56, color: VIOLET })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: 'Software Metrics Report', font: HEAD_FONT, bold: true, size: 40, color: INK })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: 'Size-Oriented · Function-Oriented · Quality Metrics', font: FONT, italics: true, size: 24, color: MUTED })],
  }),
);

// Title metadata table (borderless)
const metaRows = [
  ['Project', 'CurtainCall — Movie Ticket Booking System'],
  ['Stack', 'React + Vite (frontend), Node/Express + MongoDB (backend)'],
  ['Scope', 'All application source; excludes node_modules, build output, lock files'],
  ['Measured size', '2,308 SLOC · 202 Function Points · 3 roles · 6 data models'],
  ['Basis', 'Values counted from the repository; effort/cost use a labelled scenario'],
];
children.push(
  new Table({
    width: { size: 90, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE }, insideVertical: noBorder },
    rows: metaRows.map(([k, v]) =>
      new TableRow({
        children: [
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: k, font: FONT, bold: true, size: 20, color: VIOLET })] })] }),
          new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 20, color: INK })] })] }),
        ],
      })
    ),
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---- 1. Why these metrics ----
children.push(h1('1.  Why these metrics, in plain language'));
children.push(body('The point of measuring software is not to collect numbers — it is to answer three practical questions. Each metric family answers one of them.'));
children.push(bullet([txt('Size-oriented metrics', { bold: true, size: 21, color: INK }), txt(' — “How big is this, really?” They count lines of code and normalise effort, defects and cost against that size. Simple to gather, easy to misuse.', { size: 21, color: INK })]));
children.push(bullet([txt('Function-oriented metrics', { bold: true, size: 21, color: INK }), txt(' — “How much functionality did we deliver?” Function Points measure what the software does for the user, independent of language.', { size: 21, color: INK })]));
children.push(bullet([txt('Quality metrics', { bold: true, size: 21, color: INK }), txt(' — “Is it any good, and will it stay maintainable?” Defect density, complexity, comment ratio and modularity.', { size: 21, color: INK })]));
children.push(body('Each section shows the raw measurements, the calculation, and then a human reading of what it means for this project.'));

// ---- 2. Raw measurements ----
children.push(h1('2.  Raw measurements (the ground truth)'));
children.push(body('All figures were counted programmatically from the repository.'));
children.push(table(
  ['Measure', 'Value'],
  [
    ['Total source files measured', '47'],
    ['Total physical lines', '2,808'],
    ['Blank lines', '355'],
    ['Comment lines', '145'],
    ['Source Lines of Code (SLOC)', '2,308'],
    ['Frontend SLOC (src/)', '1,036 (8 files)'],
    ['Backend SLOC (server/src/)', '1,218 (35 files)'],
    ['REST endpoints (route handlers)', '29'],
    ['Data models (MongoDB collections)', '6'],
    ['User roles with distinct permissions', '3'],
  ],
  [AlignmentType.LEFT, R]
));
children.push(spacer());
children.push(h3('Largest files by SLOC'));
children.push(table(
  ['File', 'SLOC', 'Role'],
  [
    ['src/pages.jsx', '360', 'All customer-facing pages'],
    ['src/Dashboard.jsx', '232', 'Owner/admin console'],
    ['src/styles.css', '194', 'Design system'],
    ['server/.../bookingController.js', '147', 'Booking logic + transactions'],
    ['server/.../showController.js', '115', 'Showtime management'],
  ],
  [AlignmentType.LEFT, R, AlignmentType.LEFT]
));
children.push(para([txt('Note on honesty: ', { bold: true, size: 20, color: MUTED }), txt('KLOC = 2,308 / 1,000 = 2.308. Per-KLOC figures on a project this small are illustrative of method, not statistically robust.', { italics: true, size: 20, color: MUTED })]));

// ---- 3. Size-oriented ----
children.push(h1('3.  Size-Oriented Metrics'));
children.push(body('Size-oriented metrics take one agreed measure of size (KLOC) and express everything else as a ratio to it. The effort, cost and defect figures below use a transparent, clearly-labelled assumed scenario so the arithmetic is visible — swap in your tracker’s real numbers for a production report.'));
children.push(h3('3.1  Assumed project scenario'));
children.push(table(
  ['Input', 'Assumed value', 'Basis'],
  [
    ['Size', '2.308 KLOC', 'Measured'],
    ['Effort', '2.5 person-months', 'Typical for this feature set with framework reuse'],
    ['Cost', '₹1,50,000 (₹60,000/person-month)', 'Illustrative blended rate'],
    ['Defects found (dev + test)', '18', 'Assumed scenario'],
    ['Pages of documentation', '3', 'README + metrics + inline'],
  ]
));
children.push(spacer());
children.push(h3('3.2  Calculations'));
children.push(...code([
  'Productivity   = KLOC / Effort   = 2.308 / 2.5   = 0.923 KLOC/person-month  (~923 LOC)',
  'Cost per LOC   = Cost / LOC       = 150000 / 2308 = Rs. 65.0 per line',
  'Quality        = Defects / KLOC   = 18 / 2.308    = 7.80 defects per KLOC',
  'Documentation  = Pages / KLOC     = 3 / 2.308     = 1.30 pages per KLOC',
]));
children.push(h3('3.3  Human reading'));
children.push(bullet([txt('Productivity (~923 LOC/person-month) is healthy for app code that leans on mature frameworks — each line carries more leverage than raw LOC suggests.', { size: 21, color: INK })]));
children.push(bullet([txt('Cost per LOC (₹65) is only meaningful against your own baseline; comparing languages with it is misleading.', { size: 21, color: INK })]));
children.push(bullet([txt('Defect density (7.8/KLOC) sits in a reasonable pre-release band (industry ~5–15/KLOC during development).', { size: 21, color: INK })]));
children.push(bullet([txt('Caveat: size metrics punish expressive code — refactoring to fewer lines would raise “defects/KLOC” even as quality improves. That is why function points exist.', { size: 21, color: INK })]));

// ---- 4. Function-oriented ----
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1('4.  Function-Oriented Metrics (Function Point Analysis)'));
children.push(body('Function Points measure delivered functionality independent of language. We classify externally visible functions into five types, weight each by complexity to get the Unadjusted Function Points (UFP), then adjust by 14 technical characteristics.'));
children.push(h3('4.1  The five function types, mapped to this project'));
children.push(table(
  ['Type', 'What it is', 'Where it appears'],
  [
    ['EI — External Inputs', 'Data entering the system', 'Register, Login, Profile update, CRUD for movies/theatres/screens/shows, Book, Cancel, Set role'],
    ['EO — External Outputs', 'Derived output to the user', 'Ticket (computed total), Activity log, Seats-sold summary, Booking confirmation'],
    ['EQ — External Inquiries', 'Retrieval without derivation', 'Movie list/detail, Theatres, Showtimes, My bookings, Seat map, User list'],
    ['ILF — Internal Logical Files', 'Data maintained internally', 'Users, Movies, Theatres (+screens), Shows, Bookings, Activity log'],
    ['EIF — External Interface Files', 'Data referenced externally', 'None — the app owns all its data'],
  ]
));
children.push(spacer());
children.push(h3('4.2  Counting and weighting (IFPUG average weights)'));
children.push(table(
  ['Function type', 'Count', 'Weight', 'FP'],
  [
    ['External Inputs (EI)', '18', '4', '72'],
    ['External Outputs (EO)', '4', '5', '20'],
    ['External Inquiries (EQ)', '7', '4', '28'],
    ['Internal Logical Files (ILF)', '6', '10', '60'],
    ['External Interface Files (EIF)', '0', '7', '0'],
    ['Unadjusted Function Points (UFP)', '', '', '180'],
  ],
  [AlignmentType.LEFT, R, R, R]
));
children.push(spacer());
children.push(h3('4.3  Value Adjustment Factor (VAF)'));
children.push(body('Each of the 14 General System Characteristics is scored 0 (none) to 5 (strong). Scores reflect the actual system.'));
children.push(table(
  ['#', 'General System Characteristic', 'Score', 'Why'],
  [
    ['1', 'Data communications', '4', 'Client/server REST, token auth'],
    ['2', 'Distributed data processing', '2', 'Single API + DB'],
    ['3', 'Performance', '3', 'Indexed queries, atomic booking'],
    ['4', 'Heavily used configuration', '2', 'Modest expected load'],
    ['5', 'Transaction rate', '3', 'Booking is transactional'],
    ['6', 'Online data entry', '5', 'Everything is online forms'],
    ['7', 'End-user efficiency', '4', 'Filters, seat map, dashboards'],
    ['8', 'Online update', '5', 'Live CRUD across resources'],
    ['9', 'Complex processing', '3', 'Seat conflict logic, RBAC scoping'],
    ['10', 'Reusability', '4', 'Shared middleware, UI primitives'],
    ['11', 'Installation ease', '3', 'Seed script, .env.example'],
    ['12', 'Operational ease', '3', 'Health check, graceful shutdown'],
    ['13', 'Multiple sites', '2', 'Single deployment assumed'],
    ['14', 'Facilitate change', '4', 'Capability-based RBAC, layered'],
    ['', 'Sum (ΣFi)', '47', ''],
  ],
  [C, AlignmentType.LEFT, R, AlignmentType.LEFT]
));
children.push(spacer());
children.push(...code([
  'VAF = 0.65 + (0.01 x 47) = 0.65 + 0.47 = 1.12',
]));
children.push(h3('4.4  Adjusted Function Points & derived metrics'));
children.push(...code([
  'AFP (FP) = UFP x VAF = 180 x 1.12 = 201.6  ~  202 Function Points',
  '',
  'Backfiring at ~53 LOC/FP for JavaScript:',
  'Estimated LOC from scratch = 202 x 53 = 10,706 LOC',
  'Actual measured LOC        = 2,308 LOC',
  'Framework leverage         = 2308 / 10706 ~ 0.22  (you wrote ~22% of a from-scratch build)',
  '',
  'FP productivity = 202 / 2.5    = 80.8 FP per person-month',
  'Cost per FP     = 150000 / 202 = Rs. 742 per Function Point',
  'Defects per FP  = 18 / 202     = 0.089 defects per FP',
]));
children.push(h3('4.5  Human reading'));
children.push(bullet([txt('~202 FP places CurtainCall in the small-to-medium application band — more functionality than the 2.3 KLOC headline implies (3 roles, 6 entities, full CRUD, transactional booking, auth).', { size: 21, color: INK })]));
children.push(bullet([txt('The framework-leverage ratio (~0.22) is the most telling number: the code is about a fifth of a from-scratch equivalent. That is the modern-stack dividend LOC-only metrics hide.', { size: 21, color: INK })]));
children.push(bullet([txt('VAF 1.12 honestly reflects an interactive, transactional, networked app (online update 5, online entry 5, end-user efficiency 4).', { size: 21, color: INK })]));

// ---- 5. Quality ----
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(h1('5.  Quality Metrics'));
children.push(h3('5.1  Structural / maintainability metrics (measured)'));
children.push(table(
  ['Metric', 'Value', 'Reading'],
  [
    ['Comment density', '5.2% (145/2808)', 'Low side; existing comments are high-value'],
    ['Blank-line ratio', '12.6% (355/2808)', 'Healthy — code breathes'],
    ['Avg. file size', '49 SLOC/file', 'Excellent; easy to reason about'],
    ['Largest file', '360 SLOC (pages.jsx)', 'Only file worth watching'],
    ['Frontend/backend balance', '46% / 54%', 'Logic lives on the server, as it should'],
  ]
));
children.push(spacer());
children.push(h3('5.2  Cyclomatic complexity (McCabe) — spot analysis'));
children.push(body('V(G) = decision points + 1 per function. The two most logic-heavy functions were sampled.'));
children.push(bullet([txt('bookSeats / createBooking', { bold: true, size: 21, color: INK }), txt(' — past-show, seat-validity, seat-clash, code-collision loop, transaction branch, retry path → V(G) ≈ 8–9. The complexity hotspot, appropriately, since preventing double-booking is the hardest correctness problem. Still within the moderate band (McCabe flags >10).', { size: 21, color: INK })]));
children.push(bullet([txt('Typical controller (updateMovie)', { bold: true, size: 21, color: INK }), txt(' — one not-found branch, one success path → V(G) ≈ 2–3. Trivially testable.', { size: 21, color: INK })]));
children.push(para([txt('Reading: ', { bold: true, size: 21, color: INK }), txt('complexity is concentrated where it belongs (booking) and low everywhere else. No function appears to cross the risky >10 threshold.', { size: 21, color: INK })]));
children.push(h3('5.3  Defect Removal Efficiency (DRE)'));
children.push(...code([
  'DRE = E / (E + D)       E = defects found before delivery,  D = found after',
  'DRE = 18 / (18 + 2) = 18 / 20 = 0.90 = 90%',
]));
children.push(para([txt('Reading: ', { bold: true, size: 21, color: INK }), txt('90% is good (world-class ~95%+). The two leaked issues (CORS allow-list, server not started) were environmental, not logic defects — the functional core held up. Both are now addressed, which raises future DRE.', { size: 21, color: INK })]));
children.push(h3('5.4  Quality summary scorecard'));
children.push(table(
  ['Dimension', 'Assessment', 'Evidence'],
  [
    ['Modularity', 'Strong', '49 SLOC/file avg, clean layer separation'],
    ['Complexity control', 'Strong', 'Hotspot V(G)~8, rest trivial'],
    ['Documentation (in-code)', 'Moderate', '5.2% comment density; good README'],
    ['Defect removal', 'Good', '90% DRE; escapes were config, not logic'],
    ['Testability', 'Good', 'Stateless controllers, 25 passing e2e checks'],
    ['Security posture', 'Strong', 'bcrypt, JWT, zod validation, RBAC, rate limiting'],
  ]
));

// ---- 6. Overall interpretation ----
children.push(h1('6.  Overall interpretation'));
children.push(bullet([txt('Size says it is a compact ~2.3 KLOC codebase — but size alone undersells it.', { size: 21, color: INK })]));
children.push(bullet([txt('Function points say it delivers ~202 FP of real functionality, achieved with only ~22% of a from-scratch build — the payoff of a well-chosen stack.', { size: 21, color: INK })]));
children.push(bullet([txt('Quality says the structure is clean, defect removal is effective (90% DRE), and the weak spot is in-code documentation density, not structure or security.', { size: 21, color: INK })]));
children.push(h3('Three metrics-driven recommendations'));
children.push(bullet([txt('Raise comment density on public backend modules from ~5% toward ~10–12% to protect maintainability as the team grows.', { size: 21, color: INK })]));
children.push(bullet([txt('Add unit tests around the bookSeats hotspot (V(G)~8) so its branches stay covered as it evolves.', { size: 21, color: INK })]));
children.push(bullet([txt('Watch pages.jsx (360 SLOC); if it passes ~450, split into per-page files to keep the 49-SLOC/file average.', { size: 21, color: INK })]));

// ---- 7. Appendix ----
children.push(h1('7.  Appendix — formulas used'));
children.push(...code([
  'Size-oriented:',
  '  Productivity   = KLOC / Effort',
  '  Cost per LOC   = Cost / LOC',
  '  Quality        = Defects / KLOC',
  '  Documentation  = Pages / KLOC',
  '',
  'Function-oriented:',
  '  UFP = Sum(count x weight) over EI, EO, EQ, ILF, EIF',
  '  VAF = 0.65 + 0.01 x Sum(14 GSC scores, each 0-5)',
  '  FP  = UFP x VAF',
  '',
  'Quality:',
  '  Comment density = comment lines / total lines',
  '  Cyclomatic V(G) = decision points + 1',
  '  DRE = E / (E + D)',
]));
children.push(para([txt('Measured values are counted from the repository. Effort, cost and post-release defect counts use a clearly-labelled assumed scenario; replace them with your tracker’s real figures for a production report.', { italics: true, size: 19, color: MUTED })]));

// ====================================================================
const doc = new Document({
  creator: 'CurtainCall',
  title: 'CurtainCall Software Metrics Report',
  description: 'Size, function-point and quality metrics',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
      children,
    },
  ],
});

const buf = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buf);
console.log('Wrote', OUT, `(${(buf.length / 1024).toFixed(1)} KB)`);
