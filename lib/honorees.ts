export type Person = {
  id: string;
  name: string;
  title: string;
  photo: {
    src: string;
    width: number;
    height: number;
  } | null;
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

export const honoreeGroups: HonoreeGroup[] = [
  {
    id: "patronage",
    label: "Under the patronage of",
    people: [
      {
        id: "tarek-ali",
        name: "Prof. Dr. Tarek Ali",
        title: "President of Beni Suef National University",
        photo: {
          src: "/people/tarek-ali.jpg",
          width: 480,
          height: 480,
        },
      },
      {
        id: "rasha-tawfik",
        name: "Prof. Dr. Rasha Tawfik",
        title: "Vice President for Academic Affairs",
        photo: {
          src: "/people/rasha-tawfik.jpg",
          width: 480,
          height: 480,
        },
      },
      {
        id: "ahmed-osama",
        name: "Prof. Dr. Ahmed Osama",
        title: "Dean of the Health Sciences Sector",
        photo: {
          src: "/people/ahmed-osama.jpg",
          width: 480,
          height: 480,
        },
      },
      {
        id: "doaa-hamdy",
        name: "Prof. Dr. Doaa Hamdy",
        title: "Managing Director, Medicine and Surgery Program",
        photo: {
          src: "/people/doaa-hamdy.jpg",
          width: 480,
          height: 480,
        },
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
        photo: {
          src: "/people/sherine-ghaleb.jpg",
          width: 480,
          height: 480,
        },
      },
      {
        id: "osama-abdelhay",
        name: "Prof. Dr. Osama Abdelhay",
        title: "Head of the Egyptian Medical Syndicate",
        photo: {
          src: "/people/osama-abdelhay.jpg",
          width: 480,
          height: 480,
        },
      },
      {
        id: "emad-el-banna",
        name: "Prof. Dr. Emad El-Banna",
        title: "Head of the Beni Suef Medical Syndicate",
        photo: {
          src: "/people/emad-el-banna.jpg",
          width: 480,
          height: 480,
        },
      },
    ],
  },
];
