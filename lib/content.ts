export type CommitteeRole = {
  role: string;
  name: string | null;
};

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

export const committee: CommitteeRole[] = [];

export const schedule: Session[] = [];

export const speakers: Speaker[] = [];

export const posters: Poster[] = [];

export const sponsors: Sponsor[] = [];
