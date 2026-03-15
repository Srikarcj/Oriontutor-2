import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { Bell, Menu, PanelLeft, Search } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useClerk, useUser } from "@clerk/nextjs";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { courses as localCourses } from "../../lib/course-data";

const navItems = [
  { href: "/learning", label: "Learning Hub" },
  { href: "/study-materials", label: "Study Materials" },
  { href: "/library", label: "Library" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppShell({
  title,
  subtitle,
  children,
  onMenuToggle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onMenuToggle?: () => void;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCourses, setSearchCourses] = useState<any[]>([]);
  const [searchCategories, setSearchCategories] = useState<string[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const links = useMemo(
    () =>
      navItems.map((item) => {
        const active = router.pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`app-nav-link ${active ? "active" : ""}`}>
            <span>{item.label}</span>
          </Link>
        );
      }),
    [router.pathname]
  );

  const pageTitle = title ? `${title} - OrionTutor` : "OrionTutor";
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [] as Array<{ label: string; href: string; meta: string }>;
    const query = searchQuery.toLowerCase();
    const courseMatches = searchCourses
      .filter((course) => {
        const title = String(course.title || "").toLowerCase();
        const instructor = String(course.instructor || "").toLowerCase();
        const category = String(course.category || "").toLowerCase();
        const skills = Array.isArray(course.skills) ? course.skills : [];
        return (
          title.includes(query) ||
          instructor.includes(query) ||
          category.includes(query) ||
          skills.some((skill: string) => String(skill || "").toLowerCase().includes(query))
        );
      })
      .slice(0, 5);
    const categoryMatches = searchCategories
      .filter((category) => category.toLowerCase().includes(query))
      .slice(0, 3)
      .map((category) => ({
        label: category,
        href: `/learning?category=${encodeURIComponent(category)}`,
        meta: "Category",
      }));
    return [
      ...courseMatches.map((course) => ({
        label: course.title,
        href: `/learning/${course.slug}`,
        meta: `${course.category} · ${course.level}`,
      })),
      ...categoryMatches,
    ];
  }, [searchQuery, searchCourses, searchCategories]);

  useEffect(() => {
    let active = true;
    fetch("/api/courses")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        const items = data?.items?.length ? data.items : localCourses;
        setSearchCourses(items);
        setSearchCategories(Array.from(new Set(items.map((item: any) => item.category))).filter(Boolean));
      })
      .catch(() => {
        if (!active) return;
        setSearchCourses(localCourses);
        setSearchCategories(Array.from(new Set(localCourses.map((item) => item.category))).filter(Boolean));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="shell-app">
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="OrionTutor turns YouTube videos into transcripts, structured notes, flashcards, mind maps, and AI-powered explanations."
        />
        <link rel="icon" href="/oriontutor-favicon.svg" />
        <link rel="apple-touch-icon" href="/oriontutor-mark.svg" />
      </Head>
      <header className={`app-header ${scrolled ? "scrolled" : ""}`}>
        <div className="app-header-left">
          <Link href="/" className="app-brand">
            <span className="app-brand-mark" aria-hidden="true">
              <img src="/oriontutor-mark.svg" alt="" />
            </span>
            <span className="app-brand-text">OrionTutor</span>
          </Link>
        </div>

        <nav className="app-nav">{links}</nav>

        <div className="app-header-right">
          <div className="app-search">
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
              placeholder="Search courses, skills, instructors"
            />
            {searchOpen && searchResults.length ? (
              <div className="app-search-results">
                {searchResults.map((result) => (
                  <Link
                    key={`${result.href}-${result.label}`}
                    href={result.href}
                    className="app-search-result"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span>{result.label}</span>
                    <em>{result.meta}</em>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {onMenuToggle ? (
            <button
              className="app-workspace-toggle"
              aria-label="Toggle workspace sidebar"
              onClick={onMenuToggle}
            >
              <PanelLeft size={18} />
            </button>
          ) : null}
          <button className="app-notify-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button
            className="app-menu-toggle"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <Menu size={18} />
          </button>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="app-ghost-btn">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="app-ghost-btn">Sign up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <div className="app-profile">
              <button
                className="app-avatar-btn"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="Open profile menu"
              >
                <img src={user?.imageUrl || "/avatar-placeholder.svg"} alt="Profile" />
              </button>
              {profileOpen ? (
                <div className="app-profile-menu" onMouseLeave={() => setProfileOpen(false)}>
                  <Link href="/profile" onClick={() => setProfileOpen(false)}>My Profile</Link>
                  <Link href="/my-learning" onClick={() => setProfileOpen(false)}>My Learning</Link>
                  <Link href="/profile" onClick={() => setProfileOpen(false)}>Settings</Link>
                  <button
                    className="app-signout-btn"
                    onClick={() => {
                      setProfileOpen(false);
                      signOut({ redirectUrl: "/" });
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </SignedIn>
        </div>
      </header>

      <div className={`app-mobile-nav ${mobileNavOpen ? "open" : ""}`}>
        <nav className="app-mobile-links" onClick={() => setMobileNavOpen(false)}>
          {links}
        </nav>
        <div className="app-mobile-search">
          <Search size={16} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search courses"
          />
        </div>
        <div className="app-mobile-actions">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="app-ghost-btn">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="app-ghost-btn">Sign up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="app-mobile-cta" onClick={() => setMobileNavOpen(false)}>
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </div>

      <main className="app-main">
        {title ? (
          <section className="shell-header-card">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </section>
        ) : null}
        {children}
      </main>
      <footer className="app-footer">
        <div className="app-footer-shell">
          <div className="app-footer-brand">
            <div className="app-footer-logo">
              <span className="app-brand-sigil" aria-hidden="true">
                <img src="/oriontutor-sigil.svg" alt="" />
              </span>
              <strong>OrionTutor</strong>
            </div>
            <p>
              The AI learning studio that transforms every video into structured notes, mind maps, flashcards,
              and explainers.
            </p>
            <div className="app-footer-cta">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="app-footer-btn">Sign in</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="app-footer-btn">
                  Go to Dashboard
                </Link>
              </SignedIn>
              <Link href="/features" className="app-footer-btn ghost">
                Explore Features
              </Link>
            </div>
          </div>
          <div className="app-footer-grid">
            <div>
              <h4>Product</h4>
              <Link href="/features">Features</Link>
              <Link href="/how-it-works">How It Works</Link>
              <Link href="/summarize">Summarize</Link>
              <Link href="/ask">Ask AI</Link>
            </div>
            <div>
              <h4>Resources</h4>
              <Link href="/documentation">Documentation</Link>
              <Link href="/library">Library</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <div>
              <h4>Legal</h4>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms &amp; Conditions</Link>
            </div>
            <div>
              <h4>Social</h4>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer">
                YouTube
              </a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a href="https://www.x.com" target="_blank" rel="noreferrer">
                X (Twitter)
              </a>
            </div>
          </div>
        </div>
        <div className="app-footer-bottom">
          <span>&copy; {new Date().getFullYear()} OrionTutor. All rights reserved.</span>
          <span>Built for focused learners worldwide.</span>
        </div>
      </footer>
    </div>
  );
}
