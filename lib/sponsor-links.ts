import {
  EnvelopeSimple,
  FacebookLogo,
  Globe,
  InstagramLogo,
  MapPin,
  TiktokLogo,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Sponsor, SponsorLinkKind } from "@/lib/sponsors";

// One place that knows how a sponsor contact link looks: the icon, the plain
// name and how it is announced. Both the sponsor panels and the footer credit
// bar read from here, so a contact added to a sponsor shows up in both.
export const SPONSOR_LINK_META: Record<
  SponsorLinkKind,
  { icon: typeof FacebookLogo; name: string }
> = {
  facebook: { icon: FacebookLogo, name: "Facebook" },
  instagram: { icon: InstagramLogo, name: "Instagram" },
  tiktok: { icon: TiktokLogo, name: "TikTok" },
  whatsapp: { icon: WhatsappLogo, name: "WhatsApp" },
  website: { icon: Globe, name: "Website" },
  email: { icon: EnvelopeSimple, name: "Email" },
  location: { icon: MapPin, name: "Location" },
};

export function sponsorLinkAriaLabel(
  sponsor: Sponsor,
  kind: SponsorLinkKind,
  name: string
): string {
  if (kind === "website") return `Visit ${sponsor.name} website`;
  if (kind === "location") return `Location of ${sponsor.name} on Google Maps`;
  return `${sponsor.name} on ${name}`;
}

// mailto: stays in the current context; everything else opens in a new tab.
export function isSponsorLinkExternal(kind: SponsorLinkKind): boolean {
  return kind !== "email";
}