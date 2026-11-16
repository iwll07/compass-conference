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
  // Strip honorifics: Prof., Dr., Eng., etc. (with optional trailing dots or spaces)
  const cleaned = name
    .replace(/\b(Prof|Dr|Eng)\b\.?/gi, "")
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
      {
        id: "ahmed-mohamed-gaber",
        name: "Ahmed Mohamed Gaber",
        title: "President of the Student Union, Medical Sector",
        photo: makePhoto("ahmed-mohamed-gaber"),
      },
    ],
  },
  {
    id: "special-guests",
    label: "Special guests",
    people: [
      {
        id: "mamdouh-moawad-ali",
        name: "Prof. Dr. Mamdouh Moawad Ali",
        title: "President of the National Research Centre (NRC)",
        photo: makePhoto("mamdouh-moawad-ali"),
      },
      {
        id: "abeer-nour-el-din",
        name: "Prof. Dr. Abeer Nour El-Din",
        title: "Chairperson of the Board of Directors, Medical Research Centre of Excellence – National Research Centre",
        photo: makePhoto("abeer-nour-el-din"),
      },
      {
        id: "mona-abdel-wahab",
        name: "Prof. Dr. Mona Abdel-Wahab",
        title: "Director of the Medical Research Centre of Excellence – National Research Centre",
        photo: makePhoto("mona-abdel-wahab"),
      },
      {
        id: "tamer-shawky",
        name: "Eng. Tamer Shawky",
        title: "Chairman of the Board of Trustees, Baheya Foundation",
        photo: makePhoto("tamer-shawky"),
      },
      {
        id: "mohamed-emara",
        name: "Prof. Dr. Mohamed Emara",
        title: "Director of Baheya Hospitals",
        photo: makePhoto("mohamed-emara"),
      },
      {
        id: "mohamed-abdel-moaty",
        name: "Prof. Dr. Mohamed Abdel-Moaty Samra",
        title: "Dean of the National Cancer Institute (NCI)",
        photo: makePhoto("mohamed-abdel-moaty"),
      },
      {
        id: "abeer-ashmawy",
        name: "Prof. Dr. Abeer Ashmawy",
        title: "Professor of Tumor Biology and Director of the Medical Biochemistry and Molecular Biology Unit – National Cancer Institute",
        photo: makePhoto("abeer-ashmawy"),
      },
      {
        id: "hany-hamed",
        name: "Prof. Dr. Hany Hamed",
        title: "Dean of the Faculty of Medicine, Beni Suef University",
        photo: makePhoto("hany-hamed"),
      },
      {
        id: "abeer-ahmed-abdel-moneim",
        name: "Prof. Dr. Abeer Ahmed Abdel-Moneim",
        title: "Vice Dean for Education and Student Affairs, Faculty of Medicine, Beni Suef University",
        photo: makePhoto("abeer-ahmed-abdel-moneim"),
      },
      {
        id: "mohamed-nagy",
        name: "Prof. Dr. Mohamed Nagy",
        title: "Vice Dean for Community Service and Environmental Development",
        photo: makePhoto("mohamed-nagy"),
      },
      {
        id: "manal-anwar",
        name: "Prof. Dr. Manal Anwar",
        title: "Vice Dean for Postgraduate Studies and Research",
        photo: makePhoto("manal-anwar"),
      },
      {
        id: "emad-el-banna",
        name: "Prof. Dr. Emad El-Banna",
        title: "President of the Beni Suef Medical Syndicate and Director of University Hospitals",
        photo: makePhoto("emad-el-banna"),
      },
      {
        id: "osama-abdelhay",
        name: "Prof. Dr. Osama Abdelhay",
        title: "President of the Egyptian Medical Syndicate",
        photo: makePhoto("osama-abdelhay"),
      },
      {
        id: "sherine-ghaleb",
        name: "Prof. Dr. Sherine Ghaleb",
        title: "President of the Cairo Medical Syndicate",
        photo: makePhoto("sherine-ghaleb"),
      },
      {
        id: "eman-nabil",
        name: "Prof. Dr. Eman Nabil",
        title: "Professor of Histology, Faculty of Medicine, Alexandria University",
        photo: makePhoto("eman-nabil"),
      },
      {
        id: "samraa-hussein",
        name: "Prof. Dr. Samraa Hussein",
        title: "Dean of the Faculty of Medicine, Wadi El-Nile University",
        photo: makePhoto("samraa-hussein"),
      },
      {
        id: "hany-gemeia",
        name: "Dr. Hany Gemeia",
        title: "Undersecretary of the Ministry of Health",
        photo: makePhoto("hany-gemeia"),
      },
      {
        id: "mohamed-yehia",
        name: "Dr. Mohamed Yehia",
        title: "Director of the Health Insurance Branch in Beni Suef",
        photo: makePhoto("mohamed-yehia"),
      },
      {
        id: "ali-mohamed-hassan",
        name: "Dr. Ali Mohamed Hassan",
        title: "Director of Beni Suef Specialized Hospital",
        photo: makePhoto("ali-mohamed-hassan"),
      },
    ],
  },
];
