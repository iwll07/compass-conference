export type SponsorTier = "diamond" | "gold" | "silver";

export type SponsorLinkKind = "facebook" | "instagram" | "whatsapp" | "email";

export interface SponsorLink {
  kind: SponsorLinkKind;
  href: string;
}

export interface SponsorDetailItem {
  lead: string;
  text: string;
}

export interface SponsorLocaleDetails {
  title: string;
  intro: string;
  items: SponsorDetailItem[];
}

export interface SponsorDetails {
  en: SponsorLocaleDetails;
  ar: SponsorLocaleDetails;
}

export interface SponsorLogo {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logo: SponsorLogo;
  href: string | null;
  tagline: string;
  details?: SponsorDetails;
  links?: SponsorLink[];
}

export const SPONSOR_TIERS: readonly SponsorTier[] = ["diamond", "gold", "silver"] as const;

const TIER_ORDER: Record<SponsorTier, number> = {
  diamond: 0,
  gold: 1,
  silver: 2,
};

export function sortSponsors(list: readonly Sponsor[]): Sponsor[] {
  return [...list].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}

export const sponsors: Sponsor[] = [
  {
    id: "mood-digital",
    name: "Mood Digital",
    tier: "diamond",
    logo: {
      src: "/mood-digital-logo.png",
      width: 487,
      height: 513,
      alt: "Mood Digital logo",
    },
    href: null,
    tagline: "Official Technology Partner of COMPASS 2026",
    links: [
      {
        kind: "facebook",
        href: "https://www.facebook.com/share/1CUacfNyqD/",
      },
      {
        kind: "instagram",
        href: "https://www.instagram.com/moodxdigital?rpxt=MTkzZGVucmZ1OWw2Mw==",
      },
      {
        kind: "whatsapp",
        href: "https://wa.me/201503330110?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20Mood%20Digital!%20%D8%B4%D9%81%D8%AA%D9%83%D9%85%20%D9%81%D9%8A%20%D9%85%D9%88%D9%82%D8%B9%20%D9%85%D8%A4%D8%AA%D9%85%D8%B1%20COMPASS%20%D9%88%D8%AD%D8%A7%D8%A8%D8%A8%20%D8%A3%D8%B3%D8%AA%D9%81%D8%B3%D8%B1%20%D8%B9%D9%86%20%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%D9%83%D9%85.",
      },
      {
        kind: "email",
        href: "mailto:MoodITBusiness@gmail.com",
      },
    ],
    details: {
      en: {
        title: "Official Technology Partner of COMPASS 2026",
        intro: "We engineer bespoke web applications and automated digital systems built from the ground up around your workflow:",
        items: [
          {
            lead: "Conference & Event Ecosystems:",
            text: "Registration portals, automated email ticketing, and role-based QR attendance tracking.",
          },
          {
            lead: "Clinic Management Systems:",
            text: "Online booking, electronic medical records (EMR), e-prescriptions, and live queue sync.",
          },
          {
            lead: "Protected E-Learning Portals:",
            text: "Secure video hosting, student access codes, and automated quizzes for educators.",
          },
          {
            lead: "Custom Corporate Websites:",
            text: "High-speed, modern web platforms tailored for brands and institutions.",
          },
        ],
      },
      ar: {
        title: "الشريك التكنولوجي الرسمي لمؤتمر COMPASS 2026",
        intro: "بنحول الأفكار المعقدة لأنظمة رقمية ذكية ومفصلة من الصفر (بدون قوالب جاهزة) عشان تناسب طبيعة شغلك:",
        items: [
          {
            lead: "أنظمة المؤتمرات والفعاليات:",
            text: "بوابات تسجيل، تذاكر إلكترونية أوتوماتيكية، ونظام حضور ذكي بالـ QR Code.",
          },
          {
            lead: "أنظمة إدارة العيادات والمراكز الطبية:",
            text: "حجز أونلاين، ملفات طبية إلكترونية (EMR)، روشتة ذكية، وتنظيم لحظي للأدوار.",
          },
          {
            lead: "المنصات التعليمية الخاصة:",
            text: "منصات محمية للمحاضرين والدكاترة ببث فيديو آمن، أكواد دخول، واختبارات إلكترونية.",
          },
          {
            lead: "مواقع إلكترونية احترافية:",
            text: "تصميم وبرمجة مواقع سريعة وعصرية للشركات والمؤسسات والبراندات.",
          },
        ],
      },
    },
  },
];
