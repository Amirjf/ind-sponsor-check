import { DEFAULT_SETTINGS } from '../shared/config'
import icon from '../assets/icons/icon-128.png'
import jobPage from '../assets/screenshots/job-page.jpg'
import companyPage from '../assets/screenshots/company-page.jpg'
import companyWebsite from '../assets/screenshots/company-website.jpg'

const LINKEDIN_JOBS_NL = 'https://www.linkedin.com/jobs/search/?location=Netherlands'

export default function Intro() {
  return (
    <main className="intro">
      <header className="hero">
        <div className="brand">
          <img src={icon} alt="" width={40} height={40} />
          <span>IND Sponsor Check</span>
        </div>
        <h1>Know if a company can sponsor your visa before you apply.</h1>
        <p className="lede">
          Only IND recognised sponsors can hire highly skilled migrants in the Netherlands. This extension checks the
          official register for you and shows the answer next to the company name while you browse jobs.
        </p>
        <p className="cta">
          <a className="button" href={LINKEDIN_JOBS_NL} target="_blank" rel="noopener noreferrer">
            Try it on LinkedIn jobs
          </a>
          <a href={DEFAULT_SETTINGS.registerUrl} target="_blank" rel="noopener noreferrer">
            See the IND register
          </a>
        </p>
      </header>

      <figure className="shot shot--lead">
        <img src={jobPage} alt="A job page with a green “IND recognised sponsor” badge next to the company name." />
        <figcaption>
          <strong>Job pages on LinkedIn and Indeed.</strong> Open any job and the badge appears next to the company
          name, in the side pane and on the full page.
        </figcaption>
      </figure>

      <div className="shots">
        <figure className="shot">
          <img
            src={companyPage}
            alt="A company profile with the amber “similar sponsors found” badge open, listing three matching register entries."
          />
          <figcaption>
            <strong>Company profiles.</strong> Also on LinkedIn and Indeed company pages, so you can check an employer
            before searching their openings.
          </figcaption>
        </figure>
        <figure className="shot">
          <img
            src={companyWebsite}
            alt="A company homepage with a small floating box in the bottom-right corner showing the green badge."
          />
          <figcaption>
            <strong>Company websites.</strong> On a company's own homepage — and on any job posting page that names
            the hiring company — a small box appears bottom-right when the site publishes its organisation name. Close
            it and it stays closed for that visit.
          </figcaption>
        </figure>
      </div>

      <section className="legend" aria-labelledby="legend-title">
        <h2 id="legend-title">What the badge means</h2>
        <dl>
          <div>
            <dt>
              <span className="indsc-badge indsc-badge--sponsor">✓ IND recognised sponsor</span>
            </dt>
            <dd>The company name is in the register. Click the badge to open the IND page.</dd>
          </div>
          <div>
            <dt>
              <span className="indsc-badge indsc-badge--likely">
                <span className="indsc-badge__label">≈ Similar sponsors found (3)</span>{' '}
                <span className="indsc-badge__arrow">▾</span>
              </span>
            </dt>
            <dd>
              No exact match, but names that start the same are registered. Click to see them with their KVK numbers.
              Companies often register under a legal name that differs from their brand.
            </dd>
          </div>
          <div>
            <dt>
              <span className="indsc-badge indsc-badge--none">✕ Not in IND sponsor register</span>
            </dt>
            <dd>
              Nothing close was found. Check the register yourself if the company uses a very different legal name.
            </dd>
          </div>
        </dl>
      </section>

      <section className="notes">
        <h2>Good to know</h2>
        <ul>
          <li>
            The register is downloaded from ind.nl once a day. A built-in copy makes the check work offline and right
            after install.
          </li>
          <li>
            Company names are compared inside your browser. Nothing about the pages you visit is sent anywhere.
          </li>
          <li>
            Click the extension icon in the toolbar to check any company name by hand or to see when the list was last
            updated.
          </li>
          <li>Not affiliated with IND, LinkedIn or Indeed.</li>
        </ul>
      </section>
    </main>
  )
}
