import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { honoreeGroups, getInitials, type HonoreeGroup } from "@/lib/honorees";

export function HomePatronsRow({ groups = honoreeGroups }: { groups?: HonoreeGroup[] }) {
  const visibleGroups = groups.filter((g) => g.people.length > 0);
  if (visibleGroups.length === 0) return null;

  return (
    <section className="home-patrons-section reveal" aria-labelledby="home-patrons-heading">
      <div className="home-patrons-header">
        <h2 id="home-patrons-heading" className="home-patrons-title">
          Patrons &amp; distinguished guests
        </h2>
        <Link href="/about#patrons" className="text-link">
          Meet them on the About page <ArrowUpRightIcon size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="home-patrons-groups">
        {visibleGroups.map((group) => (
          <div key={group.id} className="home-patrons-group">
            <div className="home-patrons-group-header">
              <span className="home-patrons-group-label">{group.label}</span>
              <span className="home-patrons-group-line" aria-hidden="true" />
            </div>
            <ul className="home-patrons-list">
              {group.people.map((person, index) => {
                const initials = getInitials(person.name);
                const isLast = index === group.people.length - 1;

                return (
                  <li key={person.id} className="home-patrons-item">
                    <div className="home-patrons-pulse-container" aria-hidden="true">
                      <svg
                        className="home-patrons-pulse-svg"
                        viewBox="0 0 100 72"
                        preserveAspectRatio="none"
                      >
                        {/* Continuous line running through center y=36 */}
                        <line
                          x1="0"
                          y1="36"
                          x2={isLast ? "50" : "100"}
                          y2="36"
                          className="home-patrons-pulse-line"
                        />
                        {/* Heartbeat pulse in gap before the next item (x: 82 to 98) */}
                        {!isLast && (
                          <path
                            d="M 80 36 L 84 36 L 87 22 L 91 50 L 94 33 L 96 36 L 100 36"
                            className="home-patrons-pulse-beat"
                          />
                        )}
                      </svg>
                      <div className="home-patrons-portrait-ring">
                        {person.photo ? (
                          <Image
                            src={person.photo.src}
                            alt=""
                            width={person.photo.width}
                            height={person.photo.height}
                            loading="lazy"
                            className="home-patrons-portrait"
                          />
                        ) : (
                          <div className="home-patrons-fallback">{initials}</div>
                        )}
                      </div>
                    </div>
                    <div className="home-patrons-info">
                      <h3 className="home-patrons-name">{person.name}</h3>
                      <p className="home-patrons-role">{person.title}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
