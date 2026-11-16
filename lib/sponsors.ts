export type SponsorLinkKind =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "whatsapp"
  | "website"
  | "email"
  | "location";

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

// Sponsors are all equal: there are no tiers any more. The order below is the
// order they render in, everywhere they appear, so keep Mood Digital first and
// append a new sponsor at the end of the list.
export interface Sponsor {
  id: string;
  name: string;
  logo: SponsorLogo;
  href: string | null;
  tagline?: string;
  summary?: string;
  details?: SponsorDetails;
  links?: SponsorLink[];
}

export const sponsors: Sponsor[] = [
  {
    id: "mood-digital",
    name: "Mood Digital",
    logo: {
      src: "/mood-digital-logo.png",
      width: 487,
      height: 513,
      alt: "Mood Digital logo",
    },
    href: null,
    tagline: "Official Technology Partner of COMPASS 2026",
    summary:
      "Mood Digital is a custom software and digital systems agency specializing in high-performance web applications, automated event & QR check-in ecosystems, clinic management dashboards, and e-learning platforms. Proudly powering the digital experience of COMPASS 2026.",
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
  {
    id: "sim-era",
    name: "Sim Era",
    logo: {
      src: "/sim-era-logo.png",
      width: 549,
      height: 402,
      alt: "Sim Era logo",
    },
    href: null,
    tagline: "Medical Simulation & Education Partner of COMPASS 2026",
    summary:
      "Sim Era is an Egyptian medical education specialist established in 2009, providing turnkey medical skill labs, surgical and clinical simulators, anatomical models, plastinated specimens, and interactive anatomy software. Proudly advancing hands-on clinical training at COMPASS 2026.",
    links: [
      {
        kind: "website",
        href: "https://www.sim-era.com/",
      },
      {
        kind: "email",
        href: "mailto:info@sim-era.com",
      },
    ],
    details: {
      en: {
        title: "Medical Simulation & Education Partner of COMPASS 2026",
        intro:
          "Since 2009, Sim Era has equipped medical schools and training centres across Egypt with the physical and digital tools behind hands-on clinical learning:",
        items: [
          {
            lead: "Turnkey Medical Skill Labs:",
            text: "Skill laboratories planned, equipped, and commissioned end to end, from layout to installed equipment.",
          },
          {
            lead: "Surgical & Clinical Simulators:",
            text: "Procedure-ready trainers and simulators for supervised, repeatable clinical practice.",
          },
          {
            lead: "Anatomical Models & Plastinated Specimens:",
            text: "Detailed physical anatomy resources for teaching, demonstration, and revision.",
          },
          {
            lead: "Interactive Anatomy Software:",
            text: "Digital anatomy platforms that let students explore structures layer by layer.",
          },
        ],
      },
      ar: {
        title: "شريك المحاكاة والتعليم الطبي لمؤتمر COMPASS 2026",
        intro:
          "منذ عام 2009، تجهّز Sim Era كليات الطب ومراكز التدريب في مصر بالأدوات المادية والرقمية التي يقوم عليها التعلّم السريري العملي:",
        items: [
          {
            lead: "معامل المهارات الطبية المتكاملة:",
            text: "معامل يتم تخطيطها وتجهيزها وتركيبها بالكامل، من التصميم والمعدات وحتى التشغيل.",
          },
          {
            lead: "محاكيات الجراحة والتدريب السريري:",
            text: "أجهزة ومحاكيات جاهزة للتدريب على الإجراءات تحت إشراف سريري.",
          },
          {
            lead: "المجسمات التشريحية والعينات المُجسَّمة:",
            text: "وسائل تشريح مادية دقيقة للشرح والعرض والمراجعة.",
          },
          {
            lead: "برمجيات التشريح التفاعلية:",
            text: "منصات تشريح رقمية تتيح للطلاب استكشاف الأعضاء طبقةً بطبقة.",
          },
        ],
      },
    },
  },
  {
    // No description yet: only Facebook and a location on Google Maps. On the
    // sponsors page it keeps the same full-width panel as the others but drops
    // the description area, and clicking it opens a dialog with just the links.
    id: "beni-swef-medical-syndicate",
    name: "Beni-Swef Medical Syndicate",
    tagline:
      "Prof. Dr. Emad El-Banna, President of the Beni Suef Medical Syndicate\nMaj. Gen. Dr. Safwat Abdel-Ghaffar, Secretary-General",
    logo: {
      src: "/beni-swef-medical-syndicate.png",
      width: 256,
      height: 256,
      alt: "Beni-Swef Medical Syndicate logo",
    },
    href: null,
    links: [
      {
        kind: "facebook",
        href: "https://www.facebook.com/share/1RBzviQhJf/",
      },
      {
        kind: "location",
        href: "https://maps.app.goo.gl/DY6VGfV7ufUTTQEu7",
      },
    ],
  },
  {
    // No description yet: only links, so it uses the same compact panel and
    // links-only dialog as the syndicate above.
    id: "thrills",
    name: "Thrills",
    logo: {
      src: "/thrills-logo.png",
      width: 320,
      height: 320,
      alt: "Thrills logo",
    },
    href: null,
    links: [
      {
        kind: "facebook",
        href: "https://www.facebook.com/share/19ya4d4bCD/",
      },
      {
        kind: "instagram",
        href: "https://www.instagram.com/thrills.eg?cplk=MWxldmNqeG8xNjQyeg==",
      },
      {
        kind: "tiktok",
        href: "https://www.tiktok.com/@thrills.eg?_r=1&_t=ZS-9BS7IHRsHej",
      },
      {
        kind: "email",
        href: "mailto:mythrills.eg@gmail.com",
      },
    ],
  },
  {
    // No description yet: Facebook, a Google Maps location and WhatsApp.
    id: "c4-gym",
    name: "C4 Gym & Fitness",
    logo: {
      src: "/c4-gym-logo.png",
      width: 320,
      height: 320,
      alt: "C4 Gym & Fitness logo",
    },
    href: null,
    links: [
      {
        kind: "facebook",
        href: "https://www.facebook.com/share/1CMA7kgRVE/",
      },
      {
        kind: "location",
        href: "https://maps.app.goo.gl/YX4dhLVywhDSrb2YA",
      },
      {
        kind: "whatsapp",
        href: "https://wa.me/201007007257",
      },
    ],
  },
];
