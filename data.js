/* SonicApply redesign prototype: data layer
   Everything here is sample data. Counts shown in the UI are computed live from this inventory,
   the same way CareerGPT shows the number of jobs behind each suggestion. */

window.SA_DATA = (() => {
  const candidate = {
    first: "Daniel",
    last: "Okafor",
    phone: "(415) 555-0142",
    email: "danielokafor@gmail.com",
    emailMasked: "da••••••••@gmail.com",
    backupEmail: "daniel.okafor@icloud.com",
    street: "845 Hayes St",
    city: "San Francisco",
    state: "California",
    zip: "94117",
    zipRaw: "94117-1904",
    title: "Associate Dentist",
    school: "University of California, San Francisco School of Dentistry",
    gradYear: "2016",
    resume: "Daniel Okafor - Resume.pdf",
  };

  const firstJob = {
    id: "j-first",
    title: "General Dentist",
    shift: "Full-time",
    company: "West Alamo Dental Care",
    network: "Heartland Dental",
    city: "San Antonio",
    state: "TX",
    area: "sa",
    pay: "Competitive",
    type: "Full-time · On-site",
    extra: [],
  };

  /* Extra questions an employer form can ask beyond what the first application already covered. */
  const questions = {
    yoe: { id: "yoe", short: "Years of experience", label: "Years of experience as a dentist", kind: "text", prefill: "10", note: "From your resume (DDS 2016). Edit if that's off." },
    license: { id: "license", short: "Texas license", label: "Do you hold an active Texas dental license?", kind: "chips", options: ["Yes", "No", "Application in progress"], required: true },
    start: { id: "start", short: "Start date", label: "Earliest start date", kind: "chips", options: ["Immediately", "In 2 weeks", "In 1 month", "Flexible"], required: true },
    cover: { id: "cover", short: "Cover letter", label: "Why do you want to join this practice?", kind: "textarea", draft: "I'm a general dentist with ten years of chairside experience across preventive, restorative and cosmetic care. I'm looking for a practice where I can build long-term relationships with patients and mentor a growing team, and your focus on patient-first care is exactly that.", note: "I can draft this from your resume. You can edit every word." },
    refs: { id: "refs", short: "References", label: "Two professional references (name and contact)", kind: "textarea", placeholder: "Dr. Jane Doe, Practice Owner, jane@example.com\nDr. John Roe, Clinical Director, john@example.com" },
    salary: { id: "salary", short: "Salary expectations", label: "Salary expectations", kind: "text", placeholder: "e.g. $200,000 base plus production" },
    days: { id: "days", short: "Days available", label: "Days you're available to work", kind: "chips", options: ["Mon to Fri", "Mon to Sat", "Flexible"], required: true },
    saturday: { id: "saturday", short: "Saturdays", label: "Open to Saturday shifts?", kind: "chips", options: ["Yes", "No", "Occasionally"], required: true },
    procedures: { id: "procedures", short: "Procedures", label: "Procedures you're comfortable with", kind: "textarea", placeholder: "Crowns and bridges, root canals, extractions, Invisalign…" },
    dea: { id: "dea", short: "DEA registration", label: "Current DEA registration?", kind: "chips", options: ["Yes", "No"], required: true },
    cpr: { id: "cpr", short: "CPR / BLS", label: "Current CPR / BLS certification?", kind: "chips", options: ["Yes", "No", "Expired"], required: true },
    languages: { id: "languages", short: "Languages", label: "Languages you speak with patients", kind: "text", placeholder: "English, Spanish" },
    whyleave: { id: "whyleave", short: "Reason for leaving", label: "Why are you leaving your current role?", kind: "textarea", placeholder: "A sentence or two is plenty." },
  };

  /* Inventory. area: "sa" = San Antonio and within 40 miles, "tx" = elsewhere in Texas, "us" = other states.
     practice: "private" or "group". extra: question ids the employer's form asks beyond the first application.
     title and shift drive the preference options on step 2: liquidity is thin for the exact role in the exact city, so the
     options relax one thing at a time (role, location, hours, pay) and show what each relaxation unlocks. */
  const Q0 = [];
  const FT = "Full-time", PT = "Part-time", WK = "Weekends";
  const GD = "General Dentist", SD = "Senior Dentist", AD = "Associate Dentist", LD = "Lead Dentist", DD = "Dental Director";
  const inv = [
    // San Antonio area (9, one of them at the same employer as the first application: never recommended)
    ["Alamo Heights Family Dentistry", "San Antonio", "TX", "sa", "private", "$180K to $220K", Q0, 1, true, GD, FT],
    ["West Alamo Dental Care", "San Antonio", "TX", "sa", "group", "$180K to $220K", Q0, 2, false, GD, FT],
    ["Stone Oak Dental Studio", "San Antonio", "TX", "sa", "private", "$175K to $215K", ["license"], 2, false, AD, FT],
    ["Riverwalk Dental Care", "San Antonio", "TX", "sa", "group", "$190K to $240K", Q0, 1, true, AD, FT],
    ["Bluebonnet Dental Group", "San Antonio", "TX", "sa", "group", "$205K to $250K", ["yoe", "start"], 3, false, SD, FT],
    ["Medina Valley Dental", "Castroville", "TX", "sa", "private", "", Q0, 4, false, LD, FT],
    ["Hill Country Dental Partners", "Boerne", "TX", "sa", "group", "$200K to $250K", ["yoe", "license", "start", "cover", "refs", "procedures", "cpr", "dea"], 2, true, GD, PT],
    ["Pearl District Smiles", "San Antonio", "TX", "sa", "private", "$170K to $210K", ["yoe", "license", "start", "cover", "salary", "days", "saturday", "whyleave", "languages"], 6, false, GD, WK],
    ["New Braunfels Modern Dentistry", "New Braunfels", "TX", "sa", "group", "$185K to $225K", ["yoe", "license", "start", "refs", "salary", "procedures", "dea", "cpr", "days", "whyleave"], 5, false, AD, FT],
    // Elsewhere in Texas (15)
    ["Barton Springs Dentistry", "Austin", "TX", "tx", "private", "$195K to $245K", Q0, 1, true, GD, FT],
    ["Westlake Dental Studio", "Austin", "TX", "tx", "private", "$210K to $260K", ["license", "start"], 2, false, SD, FT],
    ["Cedar Park Smiles", "Cedar Park", "TX", "tx", "group", "$180K to $220K", Q0, 3, false, GD, FT],
    ["Round Rock Dental Group", "Round Rock", "TX", "tx", "group", "", ["yoe"], 7, false, AD, FT],
    ["Lone Star Dental Group", "Dallas", "TX", "tx", "group", "$190K to $235K", Q0, 2, true, GD, FT],
    ["Oak Cliff Dental", "Dallas", "TX", "tx", "private", "$175K to $215K", ["yoe", "license", "start", "cover", "refs", "salary", "saturday", "procedures", "dea", "cpr", "languages"], 4, false, LD, FT],
    ["Frisco Modern Dentistry", "Frisco", "TX", "tx", "group", "$215K to $255K", ["start"], 1, true, SD, FT],
    ["Plano Dental Partners", "Plano", "TX", "tx", "group", "$185K to $230K", Q0, 5, false, GD, FT],
    ["Trinity Dental Group", "Fort Worth", "TX", "tx", "group", "$180K to $225K", ["yoe", "license"], 9, false, AD, FT],
    ["Heights Dental Co.", "Houston", "TX", "tx", "private", "$190K to $240K", Q0, 2, false, GD, FT],
    ["Katy Family Dental", "Katy", "TX", "tx", "private", "", ["yoe", "license", "start", "cover", "salary", "days", "procedures", "cpr"], 3, false, AD, FT],
    ["Sugar Land Dental Group", "Sugar Land", "TX", "tx", "group", "$185K to $230K", ["license", "start"], 6, false, GD, PT],
    ["Woodlands Smile Center", "The Woodlands", "TX", "tx", "private", "$200K to $250K", Q0, 1, true, GD, FT],
    ["Brightline Dental", "El Paso", "TX", "tx", "group", "$175K to $210K", ["yoe", "license", "start", "refs", "salary", "days", "saturday", "dea", "cpr", "whyleave"], 8, false, DD, FT],
    ["Corpus Christi Dental Care", "Corpus Christi", "TX", "tx", "private", "$170K to $205K", ["yoe", "license", "start", "cover", "refs", "procedures", "languages", "whyleave"], 12, false, GD, WK],
    // Other states (38)
    ["Camelback Dental Studio", "Phoenix", "AZ", "us", "private", "$185K to $225K", Q0, 2, false, GD, FT],
    ["Saguaro Dental Group", "Tucson", "AZ", "us", "group", "$175K to $215K", ["license"], 4, false, GD, FT],
    ["Red Rocks Family Dental", "Denver", "CO", "us", "private", "$190K to $240K", ["yoe", "start"], 3, false, SD, FT],
    ["Front Range Dental Partners", "Fort Collins", "CO", "us", "group", "", ["yoe", "license", "start", "cover", "refs", "salary", "days", "dea", "cpr"], 6, false, AD, FT],
    ["Biscayne Dental Care", "Miami", "FL", "us", "private", "$180K to $220K", Q0, 1, false, GD, FT],
    ["Gulf Coast Dental Group", "Tampa", "FL", "us", "group", "$175K to $215K", ["start"], 5, false, GD, FT],
    ["Peachtree Dental Studio", "Atlanta", "GA", "us", "private", "$185K to $230K", ["yoe", "license", "start", "cover", "procedures", "saturday", "cpr", "whyleave"], 2, false, AD, FT],
    ["Blue Ridge Dental Partners", "Asheville", "NC", "us", "group", "$170K to $210K", Q0, 8, false, GD, FT],
    ["Triangle Family Dentistry", "Raleigh", "NC", "us", "private", "$200K to $245K", ["license", "start"], 3, false, SD, FT],
    ["Sooner Dental Group", "Oklahoma City", "OK", "us", "group", "$175K to $220K", Q0, 2, false, GD, FT],
    ["Sandia Dental Care", "Albuquerque", "NM", "us", "private", "$170K to $205K", ["yoe"], 9, false, GD, FT],
    ["Bay Area Dental Collective", "Oakland", "CA", "us", "group", "$210K to $270K", ["yoe", "license", "start", "cover", "refs", "salary", "days", "saturday", "procedures", "dea", "cpr", "languages"], 1, true, LD, FT],
    ["Mission District Dental", "San Francisco", "CA", "us", "private", "$220K to $280K", Q0, 2, true, GD, FT],
    ["Cascadia Dental Group", "Seattle", "WA", "us", "group", "$205K to $250K", ["start"], 4, false, SD, FT],
    ["Pearl District Dental", "Portland", "OR", "us", "private", "$190K to $235K", ["yoe", "license", "start", "cover", "salary", "procedures", "cpr", "whyleave"], 7, false, AD, FT],
    ["Music City Dental Partners", "Nashville", "TN", "us", "group", "$180K to $225K", Q0, 3, false, GD, FT],
    ["Bluegrass Family Dental", "Louisville", "KY", "us", "private", "", ["license"], 11, false, GD, PT],
    ["Lakeshore Dental Studio", "Chicago", "IL", "us", "private", "$195K to $245K", ["yoe", "start"], 2, false, SD, FT],
    ["Great Lakes Dental Group", "Milwaukee", "WI", "us", "group", "$175K to $215K", Q0, 5, false, GD, FT],
    ["Twin Cities Dental Partners", "Minneapolis", "MN", "us", "group", "$185K to $230K", ["yoe", "license", "start", "refs", "salary", "days", "dea", "cpr", "languages"], 6, false, AD, FT],
    ["Gateway Dental Care", "St. Louis", "MO", "us", "private", "$170K to $210K", Q0, 4, false, GD, FT],
    ["Ozark Family Dentistry", "Springfield", "MO", "us", "private", "$165K to $200K", ["start"], 13, false, GD, WK],
    ["Magnolia Dental Group", "Birmingham", "AL", "us", "group", "$170K to $210K", ["yoe", "license"], 3, false, GD, FT],
    ["Lowcountry Dental Studio", "Charleston", "SC", "us", "private", "$180K to $220K", ["yoe", "license", "start", "cover", "refs", "saturday", "procedures", "cpr"], 2, false, AD, FT],
    ["Capital Dental Partners", "Richmond", "VA", "us", "group", "$200K to $240K", Q0, 1, true, SD, FT],
    ["Chesapeake Family Dental", "Baltimore", "MD", "us", "private", "$190K to $235K", ["license", "start"], 6, false, GD, FT],
    ["Liberty Dental Group", "Philadelphia", "PA", "us", "group", "$185K to $230K", Q0, 2, false, GD, FT],
    ["Hudson Dental Studio", "Jersey City", "NJ", "us", "private", "$200K to $250K", ["yoe", "license", "start", "cover", "salary", "days", "dea", "cpr", "languages", "whyleave"], 4, false, DD, FT],
    ["Harbor Dental Collective", "Boston", "MA", "us", "group", "$215K to $265K", ["start"], 3, false, SD, FT],
    ["Granite State Dental", "Manchester", "NH", "us", "private", "$175K to $215K", Q0, 7, false, GD, FT],
    ["Wasatch Dental Group", "Salt Lake City", "UT", "us", "group", "$180K to $220K", ["yoe"], 5, false, GD, FT],
    ["Silver State Smiles", "Las Vegas", "NV", "us", "private", "$185K to $235K", ["yoe", "license", "start", "cover", "refs", "procedures", "dea", "cpr"], 2, false, AD, FT],
    ["High Desert Dental", "Boise", "ID", "us", "group", "$175K to $215K", Q0, 9, false, GD, FT],
    ["Buckeye Family Dental", "Columbus", "OH", "us", "private", "$170K to $210K", ["license"], 4, false, GD, FT],
    ["Motor City Dental Group", "Detroit", "MI", "us", "group", "$195K to $240K", Q0, 6, false, SD, FT],
    ["Hoosier Dental Partners", "Indianapolis", "IN", "us", "group", "$170K to $210K", ["yoe", "start"], 3, false, GD, FT],
    ["Prairie Dental Studio", "Omaha", "NE", "us", "private", "$165K to $205K", Q0, 10, false, GD, FT],
    ["Crescent City Dental", "New Orleans", "LA", "us", "private", "$200K to $245K", ["yoe", "license", "start", "cover", "salary", "saturday", "cpr", "whyleave"], 5, false, SD, FT],
  ];

  const jobs = inv.map((row, i) => {
    const [company, city, state, area, practice, pay, extra, postedDays, early, title, shift] = row;
    const m = /\$(\d+)K/.exec(pay || "");
    return {
      id: "j" + (i + 1),
      title, shift, remote: false,
      company, city, state, area, practice, pay,
      salaryMin: m ? Number(m[1]) : null,
      extra: extra.slice(),
      postedDays, early,
    };
  });

  const milesFromSA = { "San Antonio": 0, "Castroville": 25, "Boerne": 30, "New Braunfels": 32, "Austin": 80, "Cedar Park": 95, "Round Rock": 95, "Dallas": 275, "Frisco": 300, "Plano": 290, "Fort Worth": 270, "Houston": 200, "Katy": 190, "Sugar Land": 195, "The Woodlands": 220, "El Paso": 550, "Corpus Christi": 145 };
  jobs.forEach(j => { if (j.state === "TX") j.miles = milesFromSA[j.city]; });

  /* Why each answer is needed. Shown under every field, written for the candidate's most likely objection. */
  const why = {
    resume: "Employers read this first. It's used only to fill in this application, and you can swap it any time.",
    first: "So the employer knows who's applying. Spelled exactly as on your resume.",
    last: "Same as it appears on your license and resume, so their records match.",
    email: "West Alamo will email you here about interviews. We never send marketing.",
    backup: "West Alamo's system rejects an application if the first email is already registered with them. A secondary email avoids that.",
    phone: "This is the number West Alamo Dental Care will call you on about your application. We won't use it for anything else.",
    street: "Their form requires a mailing address. It's for offer paperwork later, nothing is sent to you now.",
    city: "Helps the employer see whether you're local or would be moving.",
    state: "Same reason as city. Dental licenses are state-based, so this also tells them which license to expect.",
    zip: "5 digits. Their system uses it to confirm the practice location nearest you.",
    title: "Appears at the top of your application. Taken from your most recent role on your resume.",
    school: "West Alamo verifies your degree with the school, so it needs the exact name from their list.",
    grad: "Used to confirm licensure timing and years in practice.",
    locpref: "West Alamo supports several practices in Texas. This tells them which office to consider you for first.",
    relocate: "If yes, they can also consider you for openings outside this city. It never removes you from this one.",
    eeo: "Voluntary. Used only for the employer's equal-opportunity reporting, never in the hiring decision. Prefer not to say is a complete answer.",
  };

  const tierOf = (job) => job.extra.length === 0 ? "ready" : job.extra.length <= 3 ? "quick" : "long";

  /* A returning candidate: what CareerGPT holds against the email. The resume, the 18 answers from the last application,
     and the answer bank (extra questions answered on earlier applications, reused everywhere they are asked). */
  const saved = {
    email: candidate.email,
    resume: { name: "Daniel Okafor - Resume.pdf", uploaded: "2026-09-14", from: "Bright Smiles Dental, San Francisco", pages: 2 },
    summary: ["Associate Dentist", "DDS UCSF 2016", "10 years"],
    profile: { ...candidate, locpref: "Austin", relocate: "yes" },
    answers: { yoe: "10", license: "Yes", start: "In 2 weeks" },
    answerCount: 18,
  };

  /* The resume itself, rendered for the preview. */
  const resumeDoc = {
    name: "Daniel Okafor",
    title: "General Dentist, DDS",
    contact: "San Francisco, CA · (415) 555-0142 · danielokafor@gmail.com",
    summary: "General dentist with ten years of chairside experience across preventive, restorative and cosmetic care. Comfortable leading a hygiene team, mentoring associates and building long-term patient relationships in private and group settings.",
    experience: [
      { role: "Associate Dentist", org: "Golden Gate Dental Group, San Francisco, CA", dates: "2019 to present", bullets: ["Full-scope general dentistry for 1,800 active patients, 35 to 40 patients a week.", "Crowns, bridges, root canals, extractions and Invisalign, with 95% case acceptance on treatment plans.", "Mentor two newly licensed associates and lead the weekly clinical huddle."] },
      { role: "Associate Dentist", org: "Mission Family Dentistry, San Francisco, CA", dates: "2016 to 2019", bullets: ["Grew a restorative practice from 12 to 28 patients a day in a bilingual community clinic.", "Introduced same-day CEREC crowns, cutting lab turnaround from ten days to one."] },
    ],
    education: [
      { degree: "Doctor of Dental Surgery (DDS)", org: "University of California, San Francisco School of Dentistry", year: "2016" },
      { degree: "BS, Biology", org: "University of California, Davis", year: "2012" },
    ],
    licenses: ["California Dental License, active", "Texas Dental License, active (2025)", "DEA registration, current", "CPR / BLS (AHA), renewed 2026", "Invisalign certified"],
    skills: "Restorative and cosmetic dentistry · Endodontics · Simple and surgical extractions · CEREC · Dentrix · Open Dental · Spanish (conversational)",
  };

  const tiers = {
    ready: { id: "ready", title: "No extra questions", blurb: "Your first application already answers everything these ask. Nothing more to fill in." },
    quick: { id: "quick", title: "A few quick questions", blurb: "Answered once, reused for all of them." },
    long: { id: "long", title: "Longer applications", blurb: "Cover letter or references. Opt in for the right practice." },
  };

  const areaOptions = [
    { value: "sa", label: "Around San Antonio", phrase: "around San Antonio", test: j => j.area === "sa" },
    { value: "tx", label: "Anywhere in Texas", phrase: "anywhere in Texas", test: j => j.area === "sa" || j.area === "tx" },
    { value: "us", label: "Anywhere in the US", phrase: "anywhere in the US", test: () => true },
  ];
  const practiceOptions = [
    { value: "private", label: "Private practice", test: j => j.practice === "private" },
    { value: "group", label: "Group practice or DSO", test: j => j.practice === "group" },
    { value: "any", label: "Either", test: () => true },
  ];

  return { candidate, firstJob, questions, jobs, tierOf, tiers, areaOptions, practiceOptions, why, saved, resumeDoc };
})();
