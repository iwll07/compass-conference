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
    id: "malak",
    group: "student",
    name: "Malak Ashraf",
    credentials: null,
    role: "4th year medical student",
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
    role: "1st year medical student",
    affiliation: "Nile Valley University",
    photoUrl: "/people/nada-el-sayem-portrait.webp",
    bio: null,
    sessionTitle: null,
    sessionAbstract: null,
    links: [],
  },
];

export const posters: Poster[] = [];

export const sponsors: Sponsor[] = [];
