export type Session = {
  id: string;
  day: string | null;
  time: string | null;
  title: string;
  kind: "keynote" | "panel" | "workshop" | "session" | "break" | "social";
  speakers: string[];
  location: string | null;
  description: string | null;
};

export type Speaker = {
  id: string;
  group: "grand" | "student";
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

export const schedule: Session[] = [];

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
];

export const posters: Poster[] = [];

export const sponsors: Sponsor[] = [];
