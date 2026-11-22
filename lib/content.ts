export type Session = {
  id: string;
  /** ISO calendar day (YYYY-MM-DD), interpreted in Africa/Cairo. */
  day: string;
  /** 24-hour HH:MM, Africa/Cairo. End is always after start. */
  start: string;
  end: string;
  title: string;
  kind:
    | "opening"
    | "keynote"
    | "session"
    | "panel"
    | "workshop"
    | "posters"
    | "break"
    | "social"
    | "closing";
  /** null means the session spans every hall (or the whole single-track day). */
  hall: string | null;
  /** Speaker ids; empty for event bars. */
  speakers: string[];
  /** Optional sponsor mark shown on an event bar, e.g. the Sim Era session. */
  logo?: string | null;
  description: string | null;
};

export type Speaker = {
  id: string;
  group: "grand" | "student" | "other";
  name: string;
  credentials: string | null;
  affiliation: string | null;
  role: string | null;
  photoUrl: string | null;
  /** A second presenter on the same card, as on the /vote/ pair card. */
  coName?: string | null;
  coPhotoUrl?: string | null;
  bio: string | null;
  sessionTitle: string | null;
  sessionAbstract: string | null;
  links: { label: string; href: string }[];
};

export type Poster = {
  id: string;
  title: string;
  authors: string[];
  track: string | null;
  abstract: string | null;
  imageUrl: string | null;
};

export type Sponsor = {
  id: string;
  name: string;
  tier: string;
  blurb: string | null;
  logoUrl: string | null;
  website: string | null;
};

// Program transcribed from public/AGENDA.pdf (24 November 2026, Cairo). End
// times for single-time talks are the next listed start time, as agreed; the
// PDF has no hall names, so every session spans the single track. See
// lib/agenda.ts for the rendering rules and validation.
export const schedule: Session[] = [
  {
    id: "registration",
    day: "2026-11-24",
    start: "08:30",
    end: "09:10",
    title: "Registration",
    kind: "social",
    hall: null,
    speakers: [],
    description: null,
  },
  {
    id: "dna-origami-nanorobotics",
    day: "2026-11-24",
    start: "09:15",
    end: "09:30",
    title: "DNA Origami & Nanorobotics: Toward The Next Era Of Precision Medicine",
    kind: "session",
    hall: null,
    speakers: ["nada-el-sayem"],
    description: null,
  },
  {
    id: "digital-phenotyping-mental-health",
    day: "2026-11-24",
    start: "09:30",
    end: "09:45",
    title: "From Screen Taps To Mental Health: The Power Of Digital Phenotyping",
    kind: "session",
    hall: null,
    speakers: ["malak"],
    description: null,
  },
  {
    id: "sim-era-medical-systems",
    day: "2026-11-24",
    start: "09:45",
    end: "10:00",
    title: "Sim-Era For Medical Systems",
    kind: "social",
    hall: null,
    speakers: [],
    logo: "/sim-era-logo.png",
    description: null,
  },
  {
    id: "conference-opening",
    day: "2026-11-24",
    start: "10:00",
    end: "10:30",
    title: "Conference Opening",
    kind: "opening",
    hall: null,
    speakers: [],
    description: null,
  },
  {
    id: "quran-reciting",
    day: "2026-11-24",
    start: "10:00",
    end: "10:30",
    title: "Quran Reciting",
    kind: "social",
    hall: null,
    speakers: [],
    description: null,
  },
  {
    id: "opening-speeches",
    day: "2026-11-24",
    start: "10:00",
    end: "10:30",
    title: "Speeches",
    kind: "panel",
    hall: null,
    speakers: [
      "tarek-ali",
      "rasha-tawfik",
      "ahmed-osama",
      "doaa-hamdy",
      "emad-el-banna",
      "hani-hamed",
      "ahmed-mohamed-gaber",
    ],
    description: null,
  },
  {
    id: "honoring-session-morning",
    day: "2026-11-24",
    start: "10:30",
    end: "10:45",
    title: "Honoring Session",
    kind: "social",
    hall: null,
    speakers: [],
    description: null,
  },
  {
    id: "the-plastic-human",
    day: "2026-11-24",
    start: "10:45",
    end: "11:00",
    title: "The Plastic Human, Is Your Water Bottle Killing Your Brain?",
    kind: "session",
    hall: null,
    speakers: ["ebrahim"],
    description: null,
  },
  {
    id: "keynote-osama-abdelhay",
    day: "2026-11-24",
    start: "11:00",
    end: "11:20",
    title: "Head Of The Egyptian Medical Syndicate",
    kind: "keynote",
    hall: null,
    speakers: ["osama-abdelhay"],
    description: null,
  },
  {
    id: "decision-making-medicine-life",
    day: "2026-11-24",
    start: "11:20",
    end: "11:40",
    title: "Decision-Making, Medicine & Life",
    kind: "keynote",
    hall: null,
    speakers: ["wael-el-shaer"],
    description: null,
  },
  {
    id: "message-to-future-doctor",
    day: "2026-11-24",
    start: "11:40",
    end: "12:00",
    title: "رسالة إلى طبيب المستقبل",
    kind: "keynote",
    hall: null,
    speakers: ["wael-sakr"],
    description: null,
  },
  {
    id: "stories-to-be-told",
    day: "2026-11-24",
    start: "12:00",
    end: "12:20",
    title: "حكايات ولازم تتحكي",
    kind: "keynote",
    hall: null,
    speakers: ["abdel-nasser-el-naggar"],
    description: null,
  },
  {
    id: "break-posters",
    day: "2026-11-24",
    start: "12:20",
    end: "13:20",
    title: "Break, Activities & Poster Presentation Session",
    kind: "break",
    hall: null,
    speakers: [],
    description: null,
  },
  {
    id: "preeclampsia-statin-metformin-vitamin-d",
    day: "2026-11-24",
    start: "13:20",
    end: "13:40",
    title:
      "Comparative Effectiveness of Statins, Metformin, and Vitamin D for Prevention of Preeclampsia: A Systematic Review and Network Meta-analysis of Randomized Trials",
    kind: "session",
    hall: null,
    speakers: ["habiba"],
    description: null,
  },
  {
    id: "base-editing-revolution",
    day: "2026-11-24",
    start: "13:40",
    end: "14:00",
    title: "From Stop Codon To Start Of Life: The Base Editing Revolution",
    kind: "session",
    hall: null,
    speakers: ["basmala"],
    description: null,
  },
  {
    id: "organoids-miniature-organs",
    day: "2026-11-24",
    start: "14:00",
    end: "14:20",
    title:
      "Organoids: Building Miniature Organs In The Lab From Stem Cells & 3D Culture Protocols To Assembloids, Immune Co-cultures, Disease Modeling, And Personalized Clinical Trials.",
    kind: "session",
    hall: null,
    speakers: ["nada-ashraf"],
    description: null,
  },
  {
    id: "artificial-intelligence-revolution-or-risk",
    day: "2026-11-24",
    start: "14:20",
    end: "14:40",
    title: "Artificial Intelligence: Revolution Or Risk",
    kind: "session",
    hall: null,
    speakers: ["abdelrahman", "lobna"],
    description: null,
  },
  {
    id: "honoring-session-afternoon",
    day: "2026-11-24",
    start: "14:40",
    end: "15:00",
    title: "Honoring Session",
    kind: "social",
    hall: null,
    speakers: [],
    description: null,
  },
];

export const speakers: Speaker[] = [
  {
    id: "wael-el-shaer",
    group: "grand",
    name: "Prof. Dr. Wael El-Shaer",
    credentials: null,
    role: "Head of the Department of Plastic Surgery",
    affiliation: "Beni Suef University",
    photoUrl: "/people/wael-el-shaer-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "wael-sakr",
    group: "grand",
    name: "Prof. Dr. Wael Sakr",
    credentials: null,
    role: "Professor of Plastic Surgery and Former Dean of the Faculty of Medicine",
    affiliation: "Beni Suef University",
    photoUrl: "/people/wael-sakr-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "osama-abdelhay",
    group: "grand",
    name: "Prof. Dr. Osama Abdelhay",
    credentials: null,
    role: "President of the Egyptian Medical Syndicate",
    affiliation: null,
    photoUrl: "/people/osama-abdelhay-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "abdel-nasser-el-naggar",
    group: "grand",
    name: "Prof. Dr. Abdel-Nasser El-Naggar",
    credentials: null,
    role: "Professor of Plastic Surgery",
    affiliation: "Beni Suef University",
    photoUrl: "/people/abdel-nasser-el-naggar-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "emad-el-banna",
    group: "grand",
    name: "Prof. Dr. Emad El-Banna",
    credentials: null,
    role: "President of the Beni Suef Medical Syndicate and Director of University Hospitals",
    affiliation: null,
    photoUrl: "/people/emad-el-banna-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  // Student presenters in the order requested for /speakers/. This lineup order
  // is independent of the ballot order on /vote/. Every role is the plain
  // "Medical student" the user asked for — no invented year, credentials or
  // session copy. Nada El Sayem is the one exception: she is the only student
  // not at Beni Suef National University. Lobna and Abdelrahman share one card,
  // as they do on the ballot.
  {
    id: "malak",
    group: "student",
    name: "Malak Ashraf",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/malak-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "nada-el-sayem",
    group: "student",
    name: "Nada El Sayem",
    credentials: null,
    role: "Medical student",
    affiliation: "Nile Valley University",
    photoUrl: "/people/nada-el-sayem-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "ebrahim",
    group: "student",
    name: "Ebrahim Ragab",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/ebrahim-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "habiba",
    group: "student",
    name: "Habiba Mohamed",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/habiba-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "basmala",
    group: "student",
    name: "Basmala Hassan",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/basmala-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "lobna",
    group: "student",
    name: "Lobna Ahmed",
    coName: "Abdelrahman Eid",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/lobna-portrait.webp",
    coPhotoUrl: "/people/abdelrahman-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "nada-ashraf",
    group: "student",
    name: "Nada Ashraf",
    credentials: null,
    role: "Medical student",
    affiliation: "Beni Suef National University",
    photoUrl: "/people/nada-ashraf-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  // Guests named in the PDF's opening "Speeches" block. They are honorees, not
  // conference speakers, so group "other" keeps them off /speakers/. Names are
  // reproduced exactly as printed; no role or affiliation was given there.
  {
    id: "abdelrahman",
    group: "other",
    name: "Abdelrahman Eid",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/abdelrahman.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "tarek-ali",
    group: "other",
    name: "Prof. Dr. Tarek Ali",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/tarek-ali.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "rasha-tawfik",
    group: "other",
    name: "Prof. Dr. Rasha Tawfiq",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/rasha-tawfik.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "ahmed-osama",
    group: "other",
    name: "Prof. Dr. Ahmed Osama",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/ahmed-osama.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "doaa-hamdy",
    group: "other",
    name: "Prof. Dr. Doaa Hamdy",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/doaa-hamdy.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "hani-hamed",
    group: "other",
    name: "Prof. Dr. Hani Hamed",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/hani-hamed.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
  {
    id: "ahmed-mohamed-gaber",
    group: "other",
    name: "Ahmed M. Gaber",
    credentials: null,
    role: null,
    affiliation: null,
    photoUrl: "/speakers/ahmed-mohamed-gaber.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
];

export const posters: Poster[] = [];

export const sponsors: Sponsor[] = [];
