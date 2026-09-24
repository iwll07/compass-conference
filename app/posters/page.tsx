import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { posters } from "@/lib/content";

export const metadata: Metadata = {
  title: "Posters | COMPASS",
  description:
    "Explore the COMPASS research poster gallery at the Faculty of Medicine, BSNU. Posters and submission details are coming soon.",
};

export default function PostersPage() {
  return (
    <main id="main-content" className="page-shell">
      <header className="page-heading">
        <h1 className="reveal">Poster gallery</h1>
        <p className="reveal" style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>A place to spend time with the questions, methods, and findings behind the research.</p>
      </header>

      {posters.length > 0 ? (
        <section className="content-grid" aria-label="Research posters">
          {posters.map((poster) => (
            <article key={poster.id} className="poster-entry">
              {poster.imageUrl ? (
                <figure>
                  <Link href={poster.imageUrl} className="text-link" aria-label={`View full-size poster: ${poster.title}`}>
                    <Image
                      src={poster.imageUrl}
                      alt={`Research poster: ${poster.title}`}
                      width={720}
                      height={960}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </Link>
                  <figcaption>Open the image to view the full-size poster.</figcaption>
                </figure>
              ) : (
                <p className="inline-notice">Poster image coming soon.</p>
              )}
              <h2>{poster.title}</h2>
              {poster.authors.length > 0 && <p>{poster.authors.join(", ")}</p>}
              {poster.track && <p className="status-line">{poster.track}</p>}
              {poster.abstract ? (
                <details className="prose">
                  <summary>Read abstract</summary>
                  {poster.abstract.split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </details>
              ) : <p className="inline-notice">Abstract coming soon.</p>}
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state reveal" aria-labelledby="posters-coming-soon">
          <Compass className="empty-mark" size={80} weight="light" aria-hidden="true" />
          <h2 id="posters-coming-soon">Research deserves a closer look.</h2>
          <p className="status-line">Poster gallery coming soon</p>
          <p>
            No posters have been published yet. This space will bring together poster images,
            authors, and abstracts so you can explore each contribution at your own pace.
          </p>
        </section>
      )}

      <aside className="margin-note reveal" aria-labelledby="poster-submissions">
        <h2 id="poster-submissions" className="section-heading">Thinking about sharing your work?</h2>
        <p>Submission guidelines and deadlines are coming soon. Submissions are not open on this website.</p>
      </aside>
    </main>
  );
}
