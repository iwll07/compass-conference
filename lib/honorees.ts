export type PhotoVariant = {
  src: string;
  width: number;
  height: number;
};

export type PersonPhoto = {
  card: PhotoVariant;
  thumb: PhotoVariant;
  /** Backwards-compatible alias to card.src */
  src: string;
  /** Backwards-compatible alias to card.width */
  width: number;
  /** Backwards-compatible alias to card.height */
  height: number;
};

export type Person = {
  id: string;
  name: string;
  title: string;
  photo: PersonPhoto | null;
};

export type HonoreeGroup = {
  id: string;
  label: string;
  people: Person[];
};

export function getInitials(name: string): string {
  // Strip honorifics: Prof., Dr., etc. (with optional trailing dots or spaces)
  const cleaned = name
    .replace(/\b(Prof|Dr)\b\.?/gi, "")
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function makePhoto(id: string): PersonPhoto {
  return {
    card: {
      src: `/people/${id}-card.webp`,
      width: 560,
      height: 720,
    },
    thumb: {
      src: `/people/${id}-thumb.webp`,
      width: 144,
      height: 144,
    },
    src: `/people/${id}-card.webp`,
    width: 560,
    height: 720,
  };
}

export const honoreeGroups: HonoreeGroup[] = [
  {
    id: "patronage",
    label: "Under the patronage of",
    people: [
      {
        id: "tarek-ali",
        name: "Prof. Dr. Tarek Ali",
        title: "President of Beni Suef National University",
        photo: makePhoto("tarek-ali"),
      },
      {
        id: "rasha-tawfik",
        name: "Prof. Dr. Rasha Tawfik",
        title: "Vice President for Academic Affairs",
        photo: makePhoto("rasha-tawfik"),
      },
      {
        id: "ahmed-osama",
        name: "Prof. Dr. Ahmed Osama",
        title: "Dean of the Health Sciences Sector",
        photo: makePhoto("ahmed-osama"),
      },
      {
        id: "doaa-hamdy",
        name: "Prof. Dr. Doaa Hamdy",
        title: "Managing Director, Medicine and Surgery Program",
        photo: makePhoto("doaa-hamdy"),
      },
    ],
  },
  {
    id: "special-guests",
    label: "Special guests",
    people: [
      {
        id: "sherine-ghaleb",
        name: "Prof. Dr. Sherine Ghaleb",
        title: "Head of the Cairo Medical Syndicate",
        photo: makePhoto("sherine-ghaleb"),
      },
      {
        id: "osama-abdelhay",
        name: "Prof. Dr. Osama Abdelhay",
        title: "Head of the Egyptian Medical Syndicate",
        photo: makePhoto("osama-abdelhay"),
      },
      {
        id: "emad-el-banna",
        name: "Prof. Dr. Emad El-Banna",
        title: "Head of the Beni Suef Medical Syndicate",
        photo: makePhoto("emad-el-banna"),
      },
    ],
  },
];
