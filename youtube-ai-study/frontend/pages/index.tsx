import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Layers,
  Lightbulb,
  LineChart,
  MessageSquare,
  MonitorPlay,
  Network,
  PlayCircle,
  Rocket,
  Sparkles,
  Stars,
  Timer,
  Zap,
} from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { getCourseIcon } from "../lib/course-icons";

type LiveStats = {
  videosAnalyzed: number | null;
  notesGenerated: number | null;
  flashcardsCreated: number | null;
  mindmapsGenerated: number | null;
  updatedAt: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    videosAnalyzed: null,
    notesGenerated: null,
    flashcardsCreated: null,
    mindmapsGenerated: null,
    updatedAt: null,
  });
  const heroBadges = [
    "Trusted by ambitious learners",
    "AI-powered study workflows",
    "From lesson to mastery in minutes",
  ];

  const featureCards = [
    {
      title: "AI Teaching Engine",
      description: "Generates structured lessons with explanations, steps, and mastery checks.",
      icon: <Sparkles size={18} />,
    },
    {
      title: "Study Notes Generator",
      description: "Downloadable notes built from every AI lesson in real time.",
      icon: <FileText size={18} />,
    },
    {
      title: "Structured Study Notes",
      description: "Condensed notes with summaries, highlights, and key concepts.",
      icon: <BookOpen size={18} />,
    },
    {
      title: "Mind Map Generator",
      description: "Visualize relationships between concepts instantly.",
      icon: <Network size={18} />,
    },
    {
      title: "Flashcard Creation",
      description: "Auto-built flashcards for rapid recall and spaced repetition.",
      icon: <Layers size={18} />,
    },
    {
      title: "Visual Insights",
      description: "Frame-by-frame highlights with AI explanations.",
      icon: <MonitorPlay size={18} />,
    },
    {
      title: "AI Question Answering",
      description: "Ask anything and get grounded answers from the lesson.",
      icon: <MessageSquare size={18} />,
    },
    {
      title: "PDF Export",
      description: "Download summaries, notes, and transcripts in one click.",
      icon: <FileText size={18} />,
    },
  ];

  const howItWorks = [
    {
      title: "Paste a YouTube link",
      description: "Start any lesson and let OrionTutor get to work.",
      icon: <PlayCircle size={18} />,
    },
    {
      title: "AI generates the lesson",
      description: "We extract structure, concepts, and key moments automatically.",
      icon: <Zap size={18} />,
    },
    {
      title: "Generate transcripts + notes",
      description: "Get a full transcript, summaries, and structured notes.",
      icon: <FileText size={18} />,
    },
    {
      title: "Explore mind maps + flashcards",
      description: "Visualize knowledge and review it with smart cards.",
      icon: <Network size={18} />,
    },
    {
      title: "Ask the AI assistant",
      description: "Clarify anything with grounded, contextual answers.",
      icon: <MessageSquare size={18} />,
    },
  ];

  const useCases = [
    {
      title: "Students",
      description: "Turn lectures into condensed notes, flashcards, and exam-ready summaries.",
      icon: <BookOpen size={18} />,
    },
    {
      title: "Researchers",
      description: "Extract key insights, citations, and chapter summaries fast.",
      icon: <Lightbulb size={18} />,
    },
    {
      title: "Developers",
      description: "Break down technical talks into actionable learning paths.",
      icon: <Brain size={18} />,
    },
    {
      title: "Self Learners",
      description: "Build a personalized knowledge library from every lesson.",
      icon: <Stars size={18} />,
    },
    {
      title: "Content Creators",
      description: "Repurpose content into notes, highlights, and social-ready snippets.",
      icon: <Rocket size={18} />,
    },
  ];

  const aiTech = [
    {
      title: "Natural Language Processing",
      description: "Extracts meaning, topics, and summaries from dense transcripts.",
      icon: <Brain size={18} />,
    },
    {
      title: "Video Frame Analysis",
      description: "Detects visual context, slide content, and key on-screen moments.",
      icon: <MonitorPlay size={18} />,
    },
    {
      title: "Knowledge Graph Generation",
      description: "Connects concepts into explorable maps and study paths.",
      icon: <Network size={18} />,
    },
    {
      title: "AI Learning Assistant",
      description: "Conversational agent trained to explain, quiz, and reinforce learning.",
      icon: <MessageSquare size={18} />,
    },
  ];

  const stats = [
    { label: "Lessons Generated", value: "--" },
    { label: "Notes Generated", value: "--" },
    { label: "Flashcard Sets Created", value: "--" },
    { label: "Mind Maps Generated", value: "--" },
  ];
  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => {
        const items = data.items || [];
        setFeaturedCourses(items.slice(0, 10));
        setCategoryList(Array.from(new Set(items.map((item: any) => item.category))).filter(Boolean));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const data = (await res.json()) as LiveStats;
        if (mounted) {
          setLiveStats({
            videosAnalyzed: data.videosAnalyzed ?? null,
            notesGenerated: data.notesGenerated ?? null,
            flashcardsCreated: data.flashcardsCreated ?? null,
            mindmapsGenerated: data.mindmapsGenerated ?? null,
            updatedAt: data.updatedAt ?? null,
          });
        }
      } catch {
        // Keep previous values on failure.
      }
    };

    fetchStats();
    timer = setInterval(fetchStats, 15000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const statFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const formattedStats = [
    { label: "Lessons Generated", value: liveStats.videosAnalyzed },
    { label: "Notes Generated", value: liveStats.notesGenerated },
    { label: "Flashcard Sets Created", value: liveStats.flashcardsCreated },
    { label: "Mind Maps Generated", value: liveStats.mindmapsGenerated },
  ].map((item) => ({
    ...item,
    display: typeof item.value === "number" ? statFormatter.format(item.value) : "--",
  }));
  const updatedLabel = useMemo(() => {
    if (!liveStats.updatedAt) return "recently";
    const date = new Date(liveStats.updatedAt);
    if (Number.isNaN(date.getTime())) return "recently";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }, [liveStats.updatedAt]);

  return (
    <AppShell title="" subtitle="">
      <div className="landing-page">
        <section className="pre-hero">
          <div className="landing-wrap pre-hero-grid">
            <div className="pre-hero-copy">
              <span className="section-kicker">New</span>
              <h2>Turn any lesson into a complete study kit.</h2>
              <p>
                OrionTutor generates structured AI lessons, notes, quizzes, and AI Q&A so you can learn faster
                and retain more.
              </p>
              <div className="pre-hero-actions">
                <SignedOut>
                  <SignUpButton mode="redirect">
                    <button className="cta-primary">Start Free</button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className="cta-primary">
                    Open Dashboard
                  </Link>
                </SignedIn>
                <Link href="/features" className="cta-secondary">
                  See What You Get
                </Link>
              </div>
              <div className="pre-hero-highlights">
                <div>
                  <strong>Transcript + Notes</strong>
                  <span>Structured, searchable, exportable.</span>
                </div>
                <div>
                  <strong>Mind Maps</strong>
                  <span>Instant knowledge graphs by topic.</span>
                </div>
                <div>
                  <strong>Flashcards</strong>
                  <span>Auto-built review sets for recall.</span>
                </div>
                <div>
                  <strong>AI Tutor</strong>
                  <span>Ask questions with grounded answers.</span>
                </div>
              </div>
            </div>
            <div className="pre-hero-visual">
              <div className="pre-hero-orbit">
                <div className="orbit-core">
                  <Sparkles size={28} />
                  <span>AI Engine</span>
                </div>
                <div className="orbit-chip chip-a">Summary</div>
                <div className="orbit-chip chip-b">Mind Map</div>
                <div className="orbit-chip chip-c">Flashcards</div>
                <div className="orbit-ring ring-a" />
                <div className="orbit-ring ring-b" />
                <div className="orbit-ring ring-c" />
              </div>
              <div className="pre-hero-track">
                <div>
                  <span>01</span>
                  <strong>Analyze</strong>
                  <p>Video structure + transcript intelligence</p>
                </div>
                <div>
                  <span>02</span>
                  <strong>Organize</strong>
                  <p>Notes, summaries, and visual maps</p>
                </div>
                <div>
                  <span>03</span>
                  <strong>Master</strong>
                  <p>Flashcards + AI explanations</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="hero-section">
          <div className="landing-wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-badges">
                {heroBadges.map((badge) => (
                  <span key={badge} className="hero-badge">
                    {badge}
                  </span>
                ))}
              </div>
              <h1>Learn Faster with OrionTutor</h1>
              <p>
                Turn lessons into structured notes, quizzes, and AI explanations instantly.
                Build a personal learning library that grows with every lesson you complete.
              </p>
              <div className="hero-actions">
                <SignedOut>
                  <SignUpButton mode="redirect">
                    <button className="cta-primary">
                      Try OrionTutor <ArrowRight size={16} />
                    </button>
                  </SignUpButton>
                  <Link href="/features" className="cta-secondary">
                    Explore Features
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className="cta-primary">
                    Go to Dashboard <ArrowRight size={16} />
                  </Link>
                  <Link href="/features" className="cta-secondary">
                    Explore Features
                  </Link>
                </SignedIn>
              </div>
              <div className="hero-metrics">
                <div>
                  <strong>4x</strong>
                  <span>Faster study workflows</span>
                </div>
                <div>
                  <strong>12+</strong>
                  <span>AI outputs per lesson</span>
                </div>
                <div>
                  <strong>5 min</strong>
                  <span>Average analysis time</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-surface">
                <div className="hero-surface-header">
                  <span />
                  <span />
                  <span />
                  <p>OrionTutor Workspace</p>
                </div>
                <div className="hero-surface-body">
                  <div className="hero-preview-card">
                    <div className="hero-preview-title">
                      <Sparkles size={16} /> AI Summary
                    </div>
                    <p>Condensed overview with key highlights and chapter breakdowns.</p>
                  </div>
                  <div className="hero-preview-card">
                    <div className="hero-preview-title">
                      <Network size={16} /> Mind Map
                    </div>
                    <div className="hero-preview-map">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className="hero-preview-card">
                    <div className="hero-preview-title">
                      <MessageSquare size={16} /> Ask AI
                    </div>
                    <p>Get instant explanations with citations from the transcript.</p>
                  </div>
                </div>
              </div>
              <div className="hero-floating-card">
                <Timer size={16} />
                <div>
                  <strong>Live analysis</strong>
                  <span>Processing 2.3k words/min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="course-discovery">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Explore Courses</p>
              <h2>Personalized learning tracks curated by OrionTutor.</h2>
              <p>Upgrade your learning with AI-guided courses, daily lessons, and mastery checkpoints.</p>
            </div>
            <div className="course-grid">
              {featuredCourses.map((course) => {
                const Icon = getCourseIcon(course.symbol);
                const slug = String(course?.slug || "").trim();
                const href = slug ? `/course/${encodeURIComponent(slug)}` : "/learning-hub";
                const themeClass = slug ? `course-theme-${slug}` : "";
                return (
                <div key={course.slug} className={`course-card ${themeClass}`}>
                  <div className="course-media">
                    {course.image_url || course.image ? (
                      <img src={course.image_url || course.image} alt={course.title || "Course"} loading="lazy" />
                    ) : (
                      <div className="course-card-placeholder" />
                    )}
                    <div className="course-name-badge">{course.title || "Course"}</div>
                    <div className="course-symbol-badge" aria-hidden="true">
                      <Icon size={16} />
                    </div>
                  </div>
                  <div className="course-body">
                    <div className="course-meta">
                      <span className="course-symbol">
                        <Icon size={14} />
                        {course.category}
                      </span>
                      <span>{course.difficulty || "Intermediate"}</span>
                    </div>
                    <h3>{course.title}</h3>
                    <p>Adaptive track tailored to your skill level.</p>
                    <div className="course-rating">
                      <Stars size={16} />
                      <span>{Number(course.rating ?? 0).toFixed(1)}</span>
                      <em>{Number(course.students ?? 0).toLocaleString()} learners</em>
                    </div>
                    <button
                      type="button"
                      className="cta-primary small"
                      onClick={() => {
                        const prev = window.location.pathname;
                        router.push(href);
                        window.setTimeout(() => {
                          if (window.location.pathname === prev) window.location.href = href;
                        }, 400);
                      }}
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </section>

        <section className="category-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Categories</p>
              <h2>Browse subjects tailored to your goals.</h2>
              <p>Pick a category and let OrionTutor adapt the learning journey.</p>
            </div>
            <div className="category-grid">
              {categoryList.map((category) => (
                <Link key={category} href={`/learning-hub?category=${encodeURIComponent(category)}`} className="category-card">
                  <strong>{category}</strong>
                  <span>View courses</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="demo-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Interactive Product Demo</p>
              <h2>See how OrionTutor turns lessons into study assets.</h2>
              <p>Enter a lesson topic and preview the AI outputs before you begin.</p>
            </div>
            <div className="demo-grid">
              <div className="demo-input">
                <label htmlFor="demo-url">Paste a lesson topic</label>
                <div className="demo-input-row">
                  <input id="demo-url" placeholder="Explain transformers for beginners" />
                  <Link href="/dashboard" className="cta-primary small">
                    Analyze with OrionTutor
                  </Link>
                </div>
                <p className="demo-footnote">Sign in to generate a full lesson in your workspace.</p>
              </div>
              <div className="demo-output">
                <div className="demo-panel">
                  <span>Lesson Preview</span>
                  <p>"In this section we break down the core framework and how it applies to real problems..."</p>
                </div>
                <div className="demo-panel">
                  <span>Summary Preview</span>
                  <ul>
                    <li>Key themes extracted automatically</li>
                    <li>Actionable takeaways in bullet form</li>
                  </ul>
                </div>
                <div className="demo-panel">
                  <span>Key Points Preview</span>
                  <div className="demo-map">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className="demo-panel">
                  <span>Quiz Preview</span>
                  <div className="demo-flashcards">
                    <div>
                      <strong>Q:</strong> What is the central idea?
                    </div>
                    <div>
                      <strong>A:</strong> A repeatable system for deep learning.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Feature Grid</p>
              <h2>Everything you need to master lesson knowledge.</h2>
              <p>All outputs are synced, searchable, and saved to your personal library.</p>
            </div>
            <div className="feature-grid">
              {featureCards.map((item) => (
                <div key={item.title} className="feature-card">
                  <span className="feature-icon">{item.icon}</span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">How It Works</p>
              <h2>From topic to learning in five steps.</h2>
              <p>OrionTutor orchestrates lessons, notes, quizzes, and AI answers automatically.</p>
            </div>
            <div className="steps-grid">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="step-card">
                  <div className="step-index">{index + 1}</div>
                  <span className="step-icon">{step.icon}</span>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="usecase-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Use Cases</p>
              <h2>Designed for every kind of learner.</h2>
              <p>OrionTutor adapts to your workflow whether you're studying, building, or researching.</p>
            </div>
            <div className="usecase-grid">
              {useCases.map((item) => (
                <div key={item.title} className="usecase-card">
                  <span className="usecase-icon">{item.icon}</span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">AI Technology</p>
              <h2>Built on a multi-model intelligence stack.</h2>
              <p>We combine transcript intelligence, visual understanding, and knowledge graphs.</p>
            </div>
            <div className="ai-grid">
              {aiTech.map((item) => (
                <div key={item.title} className="ai-card">
                  <span className="ai-icon">{item.icon}</span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="landing-wrap final-cta-inner">
            <div>
              <h2>Start Learning Smarter with OrionTutor</h2>
              <p>Join the AI-powered study workspace built for modern learners.</p>
            </div>
            <div className="final-cta-actions">
              <SignedOut>
                <SignUpButton mode="redirect">
                  <button className="cta-primary">
                    Try OrionTutor Now <ArrowRight size={16} />
                  </button>
                </SignUpButton>
                <SignInButton mode="redirect">
                  <button className="cta-secondary">Sign in</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="cta-primary">
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              </SignedIn>
            </div>
          </div>
        </section>

        <section className="live-stats-section">
          <div className="landing-wrap">
            <div className="section-head">
              <p className="section-kicker">Live Impact</p>
              <h2>Real-time momentum across OrionTutor.</h2>
              <p>Every completed analysis updates the platform counters instantly.</p>
            </div>
            <div className="stats-grid">
              {formattedStats.map((item) => (
                <div key={item.label} className="stat-card">
                  <strong>{item.display}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="stats-note">
              <LineChart size={16} />
              <span>Live data from OrionTutor. Updated {updatedLabel}.</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
