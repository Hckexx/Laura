import { Link } from 'react-router-dom'

function Copyright() {
  return (
    <div className="flex-1 flex flex-col justify-start px-4 sm:px-6 lg:px-12 py-10 sm:py-16 lg:py-20 max-w-4xl mx-auto w-full">
      <div className="space-y-10 sm:space-y-12">

        {/* Header */}
        <div className="space-y-3 border-b border-white/[0.08] pb-8 text-left">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-400 uppercase">
            <span>Legal & Intellectual Property</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-100 tracking-tight">
            Legal
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 font-mono">
            Last Updated: September 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-left text-sm sm:text-base text-gray-300 leading-relaxed font-normal">

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              1. About LauraTV
            </h2>

            <p className="text-gray-300/90">
              LauraTV is a private software project that provides an interface for
              discovering media, accessing viewing experiences, and using features
              such as synchronized Cowatch sessions.
            </p>

            <p className="text-gray-400 text-sm">
              LauraTV does not claim ownership of third-party movies, television
              programs, characters, artwork, trademarks, or other intellectual
              property merely because they may be referenced, displayed, indexed,
              linked, embedded, or otherwise accessible through the service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              2. LauraTV Original Material
            </h2>

            <p className="text-gray-300/90">
              LauraTV retains rights in material originally created specifically for
              the project, including its name, branding, logo, original interface
              design, original written content, custom software, and other original
              project assets.
            </p>

            <p className="text-gray-400 text-sm">
              This does not extend to third-party material incorporated into or
              referenced by LauraTV. Third-party software, libraries, assets,
              trademarks, and other materials remain subject to the rights and
              licences of their respective owners.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              3. Third-Party Content & Intellectual Property
            </h2>

            <p className="text-gray-300/90">
              Movies, television shows, posters, artwork, titles, descriptions,
              characters, trademarks, logos, audiovisual works, and other
              third-party materials belong to their respective owners and rights
              holders.
            </p>

            <p className="text-gray-300/90">
              LauraTV makes no claim of copyright or other proprietary ownership
              over such third-party material.
            </p>

            <p className="text-gray-400 text-sm">
              The appearance or availability of third-party material through LauraTV
              does not by itself imply that LauraTV is affiliated with, sponsored
              by, endorsed by, or officially associated with the relevant creator,
              studio, distributor, platform, or rights holder.
            </p>

            <p className="text-gray-400 text-sm">
              All trademarks and registered trademarks remain the property of their
              respective owners.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              4. External Services & Content Sources
            </h2>

            <p className="text-gray-300/90">
              Some material or functionality accessible through LauraTV may
              originate from, link to, embed, communicate with, or otherwise depend
              upon independent third-party services.
            </p>

            <p className="text-gray-300/90">
              LauraTV does not claim ownership or control over content stored or
              operated exclusively on infrastructure belonging to independent third
              parties.
            </p>

            <p className="text-gray-400 text-sm">
              Where a complaint concerns something controlled by LauraTV itself,
              such as a LauraTV page, link, reference, image, metadata entry, or
              other project-controlled material, LauraTV can review and, where
              appropriate, modify, disable, or remove that material.
            </p>

            <p className="text-gray-400 text-sm">
              LauraTV cannot directly delete or modify material hosted exclusively
              on infrastructure that it does not operate or control.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              5. User Responsibility
            </h2>

            <p className="text-gray-300/90">
              LauraTV is intended for personal use within its intended private
              audience.
            </p>

            <p className="text-gray-300/90">
              Users are responsible for using LauraTV in accordance with laws and
              regulations applicable to them and for respecting the rights of
              copyright owners and other third parties.
            </p>

            <p className="text-gray-400 text-sm">
              Nothing on LauraTV grants users ownership of or a licence to
              redistribute, reproduce, sell, re-upload, commercially exploit, or
              otherwise exercise rights over third-party material except where
              those rights have separately been granted by the relevant rights
              holder or applicable law.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              6. Rights Holder Requests & Takedowns
            </h2>

            <p className="text-gray-300/90">
              LauraTV respects intellectual property rights.
            </p>

            <p className="text-gray-300/90">
              If you are a copyright owner, rights holder, or an authorised
              representative and believe that something controlled or referenced by
              LauraTV infringes your rights or should be removed, please contact us
              directly.
            </p>

            <p className="text-gray-400 text-sm">
              A request should preferably include:
            </p>

            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
              <li>
                Identification of the work or material concerned.
              </li>

              <li>
                The LauraTV page, URL, link, image, reference, or other item
                involved.
              </li>

              <li>
                A clear explanation of the issue.
              </li>

              <li>
                Your name and contact information.
              </li>

              <li>
                Where relevant, information showing that you are the rights holder
                or authorised to act on their behalf.
              </li>
            </ul>

            <p className="text-gray-400 text-sm">
              You do not need to use a particular form before contacting us.
            </p>

            <p className="text-gray-400 text-sm">
              LauraTV will review legitimate requests in good faith and may remove,
              disable, replace, or otherwise modify LauraTV-controlled material
              where appropriate.
            </p>

            <p className="text-gray-400 text-sm">
              If the disputed material exists exclusively on an independent
              third-party service, we may direct you to the relevant third party
              because LauraTV may not have the technical ability or authority to
              remove the underlying material itself.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              7. No Ownership Claim Through Reference or Access
            </h2>

            <p className="text-gray-300/90">
              Displaying, indexing, linking to, embedding, identifying, or providing
              an interface that interacts with third-party material does not
              constitute a claim by LauraTV that the material belongs to LauraTV.
            </p>

            <p className="text-gray-400 text-sm">
              Copyright and other intellectual-property rights remain with their
              respective owners unless expressly stated otherwise.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              8. Availability & Changes
            </h2>

            <p className="text-gray-300/90">
              LauraTV may change, remove, disable, or discontinue features, links,
              references, integrations, or other parts of the service at any time.
            </p>

            <p className="text-gray-400 text-sm">
              Third-party services may also change or become unavailable
              independently of LauraTV.
            </p>

            <p className="text-gray-400 text-sm">
              Nothing on this page is intended to waive, restrict, or override
              rights or obligations that apply under applicable law.
            </p>
          </section>

          {/* Contact Box */}
          <div className="rounded-xl border border-white/[0.1] bg-[#12161c] p-6 sm:p-8 space-y-4">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Legal & Rights Holder Contact
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-100">
                LauraTV Legal Inquiries
              </div>

              <p className="text-xs sm:text-sm text-gray-400">
                For copyright concerns, intellectual-property questions, takedown
                requests, or other legal inquiries relating to LauraTV, contact:
              </p>
            </div>

            <div>
              <a
                href="mailto:copyright@theunfilteredgoose.in"
                className="inline-flex items-center gap-2 text-sm font-mono text-amber-300 hover:text-amber-200 transition-colors underline underline-offset-4"
              >
                <span>copyright@theunfilteredgoose.in</span>
              </a>
            </div>

            <p className="text-xs sm:text-sm text-gray-500">
              Please identify the relevant material clearly so that the issue can
              be reviewed efficiently.
            </p>

            <p className="text-xs sm:text-sm text-gray-400">
              LauraTV prefers to address legitimate concerns directly and promptly
              whenever possible.
            </p>
          </div>

          {/* Policy Updates & Back to Home */}
          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-gray-500">
            <div>
              LauraTV may update this page as the project, its technical
              architecture, or applicable requirements evolve.
            </div>

            <div>
              <Link
                to="/"
                className="text-gray-400 hover:text-amber-300 transition-colors"
              >
                ← Return to Home
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

export default Copyright