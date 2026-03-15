export type CourseLesson = {
  day: number;
  title: string;
  duration: string;
  keywords: string[];
  concepts: string[];
};

export type CourseStage = {
  title: string;
  days: CourseLesson[];
};

export type CourseMaterial = {
  id: string;
  type: "PDF" | "Lecture Notes" | "Code" | "Assignment" | "Practice";
  title: string;
  description: string;
  size: string;
  url?: string;
};

export type CourseQuizQuestion = {
  id: string;
  type: "multiple" | "boolean" | "code";
  prompt: string;
  options?: string[];
  answer: string;
};

export type CourseExam = {
  day: number;
  durationMinutes: number;
  questions: CourseQuizQuestion[];
};

export type Course = {
  slug: string;
  title: string;
  instructor: string;
  rating: number;
  students: number;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  image: string;
  symbol: string;
  description: string;
  skills: string[];
  stages: CourseStage[];
  materials: CourseMaterial[];
  exams: CourseExam[];
};

export const courseCategories = [
  "Artificial Intelligence",
  "Machine Learning",
  "Data Science",
  "Cyber Security",
  "Web Development",
  "Cloud Computing",
  "Blockchain Development",
  "Generative AI",
  "Full Stack Development",
  "DevOps Engineering",
];

export const courses: Course[] = [
  {
    slug: "artificial-intelligence",
    title: "Artificial Intelligence",
    instructor: "Dr. Nila Kapoor",
    rating: 4.8,
    students: 58420,
    category: "Artificial Intelligence",
    level: "Beginner",
    image: "/course/ai-2026.svg",
    symbol: "Brain",
    description: "Build a modern AI foundation with daily lessons, animated explanations, and mastery tests.",
    skills: ["AI Concepts", "Reasoning", "Ethics", "AI Systems"],
    stages: [
      {
        title: "Core Concepts",
        days: [
          {
            day: 1,
            title: "Introduction to AI",
            duration: "28 min",
            keywords: ["ai", "intelligence", "systems"],
            concepts: ["Definition of AI", "Narrow vs General AI", "Real-world AI examples"],
          },
          {
            day: 2,
            title: "History of AI",
            duration: "30 min",
            keywords: ["history", "milestones"],
            concepts: ["AI winters", "Breakthroughs", "Modern AI boom"],
          },
          {
            day: 3,
            title: "Machine Learning Basics",
            duration: "34 min",
            keywords: ["ml", "models"],
            concepts: ["Supervised learning", "Features and labels", "Evaluation metrics"],
          },
          {
            day: 4,
            title: "Neural Networks",
            duration: "36 min",
            keywords: ["neurons", "layers"],
            concepts: ["Perceptrons", "Activation functions", "Backpropagation"],
          },
          {
            day: 5,
            title: "Deep Learning",
            duration: "38 min",
            keywords: ["deep", "training"],
            concepts: ["CNNs", "RNNs", "Training pipelines"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "ai-2026-1",
        type: "PDF",
        title: "AI Foundations Notes",
        description: "Structured notes with key definitions and diagrams.",
        size: "1.9 MB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "ai-q1",
            type: "multiple",
            prompt: "Which best describes Narrow AI?",
            options: ["Human-level general intelligence", "Task-specific intelligence", "Biological intelligence", "Unsupervised cognition"],
            answer: "Task-specific intelligence",
          },
          {
            id: "ai-q2",
            type: "boolean",
            prompt: "AI systems can learn from data.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "machine-learning",
    title: "Machine Learning",
    instructor: "Ritesh Sharma",
    rating: 4.9,
    students: 47210,
    category: "Machine Learning",
    level: "Intermediate",
    image: "/course/ml-2026.svg",
    symbol: "Cpu",
    description: "Master modern ML workflows with labs, evaluations, and guided projects.",
    skills: ["Regression", "Classification", "Model Evaluation"],
    stages: [
      {
        title: "Learning Systems",
        days: [
          {
            day: 1,
            title: "ML Problem Framing",
            duration: "30 min",
            keywords: ["problem", "framing"],
            concepts: ["Problem types", "Data readiness", "Success metrics"],
          },
          {
            day: 2,
            title: "Feature Engineering",
            duration: "35 min",
            keywords: ["features"],
            concepts: ["Encoding", "Scaling", "Feature selection"],
          },
          {
            day: 3,
            title: "Model Selection",
            duration: "32 min",
            keywords: ["models"],
            concepts: ["Baseline models", "Bias-variance", "Cross-validation"],
          },
          {
            day: 4,
            title: "Training & Tuning",
            duration: "34 min",
            keywords: ["training", "tuning"],
            concepts: ["Hyperparameters", "Grid search", "Overfitting"],
          },
          {
            day: 5,
            title: "Evaluation",
            duration: "28 min",
            keywords: ["metrics"],
            concepts: ["Precision/Recall", "ROC-AUC", "Error analysis"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "ml-2026-1",
        type: "Lecture Notes",
        title: "Model Evaluation Cheatsheet",
        description: "Metrics and diagnostics quick guide.",
        size: "780 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 12,
        questions: [
          {
            id: "ml-q1",
            type: "multiple",
            prompt: "A classification problem predicts:",
            options: ["Continuous values", "Categories", "Anomalies only", "Time series"],
            answer: "Categories",
          },
          {
            id: "ml-q2",
            type: "boolean",
            prompt: "Train/test split helps evaluate generalization.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "data-science",
    title: "Data Science",
    instructor: "Priya Menon",
    rating: 4.8,
    students: 61140,
    category: "Data Science",
    level: "Beginner",
    image: "/course/ds-2026.svg",
    symbol: "LineChart",
    description: "Analyze, visualize, and model data with structured daily lessons.",
    skills: ["Pandas", "Visualization", "Statistics"],
    stages: [
      {
        title: "Data Workflow",
        days: [
          {
            day: 1,
            title: "Data Lifecycle",
            duration: "26 min",
            keywords: ["workflow"],
            concepts: ["Collect", "Clean", "Analyze"],
          },
          {
            day: 2,
            title: "Exploration",
            duration: "32 min",
            keywords: ["eda"],
            concepts: ["Distributions", "Correlations", "Outliers"],
          },
          {
            day: 3,
            title: "Visualization",
            duration: "30 min",
            keywords: ["charts"],
            concepts: ["Storytelling", "Dashboards", "Best practices"],
          },
          {
            day: 4,
            title: "Modeling Basics",
            duration: "34 min",
            keywords: ["models"],
            concepts: ["Regression", "Classification", "Evaluation"],
          },
          {
            day: 5,
            title: "Insights",
            duration: "22 min",
            keywords: ["insights"],
            concepts: ["Recommendations", "KPIs", "Decision support"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "ds-2026-1",
        type: "PDF",
        title: "Data Science Quickstart",
        description: "Checklists and templates for analysis.",
        size: "1.2 MB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "ds-q1",
            type: "multiple",
            prompt: "Which step comes first in a data lifecycle?",
            options: ["Analyze", "Collect", "Model", "Deploy"],
            answer: "Collect",
          },
          {
            id: "ds-q2",
            type: "boolean",
            prompt: "EDA stands for Exploratory Data Analysis.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "cyber-security",
    title: "Cyber Security",
    instructor: "Kavya Iqbal",
    rating: 4.7,
    students: 42100,
    category: "Cyber Security",
    level: "Beginner",
    image: "/course/cyber-2026.svg",
    symbol: "Shield",
    description: "Secure modern systems with threat modeling, SOC workflows, and incident response.",
    skills: ["Threat Modeling", "SOC", "Zero Trust"],
    stages: [
      {
        title: "Security Fundamentals",
        days: [
          {
            day: 1,
            title: "Security Mindset",
            duration: "24 min",
            keywords: ["threats"],
            concepts: ["CIA triad", "Attack surfaces", "Risk"],
          },
          {
            day: 2,
            title: "Network Security",
            duration: "32 min",
            keywords: ["network"],
            concepts: ["Firewalls", "Segmentation", "Monitoring"],
          },
          {
            day: 3,
            title: "Endpoint Defense",
            duration: "28 min",
            keywords: ["endpoint"],
            concepts: ["EDR", "Patching", "Hardening"],
          },
          {
            day: 4,
            title: "Identity Security",
            duration: "30 min",
            keywords: ["identity"],
            concepts: ["IAM", "MFA", "Least privilege"],
          },
          {
            day: 5,
            title: "Incident Response",
            duration: "34 min",
            keywords: ["response"],
            concepts: ["Runbooks", "Containment", "Forensics"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "cyber-1",
        type: "Practice",
        title: "Threat Model Worksheet",
        description: "Identify risks and mitigations.",
        size: "520 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 12,
        questions: [
          {
            id: "cy-q1",
            type: "multiple",
            prompt: "CIA stands for:",
            options: ["Confidentiality, Integrity, Availability", "Control, Inspect, Audit", "Cloud, Identity, Access", "Compliance, Integrity, Audit"],
            answer: "Confidentiality, Integrity, Availability",
          },
          {
            id: "cy-q2",
            type: "boolean",
            prompt: "Least privilege reduces attack surface.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "web-development",
    title: "Web Development",
    instructor: "Arjun Mehta",
    rating: 4.6,
    students: 69890,
    category: "Web Development",
    level: "Beginner",
    image: "/course/web-2026.svg",
    symbol: "Globe",
    description: "Build fast, modern web apps with responsive UI and API integration.",
    skills: ["HTML", "CSS", "JavaScript", "APIs"],
    stages: [
      {
        title: "Web Essentials",
        days: [
          {
            day: 1,
            title: "HTML Foundations",
            duration: "26 min",
            keywords: ["html"],
            concepts: ["Semantic tags", "Structure", "Accessibility"],
          },
          {
            day: 2,
            title: "CSS Layouts",
            duration: "30 min",
            keywords: ["css"],
            concepts: ["Flexbox", "Grid", "Responsive design"],
          },
          {
            day: 3,
            title: "JavaScript Basics",
            duration: "34 min",
            keywords: ["js"],
            concepts: ["Variables", "Functions", "DOM"],
          },
          {
            day: 4,
            title: "API Integration",
            duration: "32 min",
            keywords: ["api"],
            concepts: ["Fetch", "REST", "Async"],
          },
          {
            day: 5,
            title: "Deploy Web Apps",
            duration: "28 min",
            keywords: ["deploy"],
            concepts: ["Hosting", "CDN", "Performance"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "web-1",
        type: "Code",
        title: "Responsive Layout Starter",
        description: "Starter kit for responsive UI.",
        size: "640 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 8,
        questions: [
          {
            id: "web-q1",
            type: "multiple",
            prompt: "Which HTML element is semantic?",
            options: ["div", "span", "header", "b"],
            answer: "header",
          },
          {
            id: "web-q2",
            type: "boolean",
            prompt: "HTML defines the structure of a webpage.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "cloud-computing",
    title: "Cloud Computing",
    instructor: "Neha Varma",
    rating: 4.7,
    students: 53100,
    category: "Cloud Computing",
    level: "Intermediate",
    image: "/course/cloud-2026.svg",
    symbol: "Cloud",
    description: "Design cloud architectures with security, scalability, and observability.",
    skills: ["Cloud", "Architecture", "Security"],
    stages: [
      {
        title: "Cloud Core",
        days: [
          {
            day: 1,
            title: "Cloud Fundamentals",
            duration: "28 min",
            keywords: ["cloud"],
            concepts: ["IaaS", "PaaS", "SaaS"],
          },
          {
            day: 2,
            title: "Identity & Access",
            duration: "30 min",
            keywords: ["iam"],
            concepts: ["Roles", "Policies", "MFA"],
          },
          {
            day: 3,
            title: "Compute & Storage",
            duration: "34 min",
            keywords: ["compute"],
            concepts: ["VMs", "Containers", "Object storage"],
          },
          {
            day: 4,
            title: "Observability",
            duration: "26 min",
            keywords: ["observability"],
            concepts: ["Logs", "Metrics", "Tracing"],
          },
          {
            day: 5,
            title: "Cost Optimization",
            duration: "24 min",
            keywords: ["cost"],
            concepts: ["Reserved instances", "Autoscaling", "Budgets"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "cloud-2026-1",
        type: "PDF",
        title: "Cloud Architecture Map",
        description: "Reference diagrams for cloud services.",
        size: "1.5 MB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "cloud-q1",
            type: "multiple",
            prompt: "Which model provides managed runtime?",
            options: ["IaaS", "PaaS", "On-prem", "Bare metal"],
            answer: "PaaS",
          },
          {
            id: "cloud-q2",
            type: "boolean",
            prompt: "SaaS delivers complete applications.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "blockchain-development",
    title: "Blockchain Development",
    instructor: "Ishaan Rao",
    rating: 4.6,
    students: 32450,
    category: "Blockchain Development",
    level: "Intermediate",
    image: "/course/blockchain-2026.svg",
    symbol: "Blocks",
    description: "Build smart contracts, decentralized apps, and secure protocols.",
    skills: ["Smart Contracts", "Solidity", "Web3"],
    stages: [
      {
        title: "Blockchain Core",
        days: [
          {
            day: 1,
            title: "Blockchain Basics",
            duration: "28 min",
            keywords: ["blocks"],
            concepts: ["Ledgers", "Consensus", "Hashing"],
          },
          {
            day: 2,
            title: "Smart Contracts",
            duration: "32 min",
            keywords: ["contracts"],
            concepts: ["Solidity", "State", "Security"],
          },
          {
            day: 3,
            title: "DApp Architecture",
            duration: "34 min",
            keywords: ["dapp"],
            concepts: ["Wallets", "RPC", "Front-end"],
          },
          {
            day: 4,
            title: "Security Audits",
            duration: "30 min",
            keywords: ["security"],
            concepts: ["Re-entrancy", "Testing", "Auditing"],
          },
          {
            day: 5,
            title: "Scaling",
            duration: "26 min",
            keywords: ["scaling"],
            concepts: ["Layer 2", "Rollups", "Fees"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "bc-1",
        type: "Code",
        title: "Smart Contract Starter",
        description: "Solidity starter templates.",
        size: "820 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 12,
        questions: [
          {
            id: "bc-q1",
            type: "multiple",
            prompt: "A blockchain is best described as:",
            options: ["Centralized database", "Distributed ledger", "File system", "Cache"],
            answer: "Distributed ledger",
          },
          {
            id: "bc-q2",
            type: "boolean",
            prompt: "Blocks are linked via cryptographic hashes.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "generative-ai",
    title: "Generative AI",
    instructor: "Sana Verma",
    rating: 4.9,
    students: 71200,
    category: "Generative AI",
    level: "Advanced",
    image: "/course/genai-2026.svg",
    symbol: "Sparkles",
    description: "Build, evaluate, and deploy GenAI systems with modern safety practices.",
    skills: ["LLMs", "Prompting", "RAG"],
    stages: [
      {
        title: "GenAI Stack",
        days: [
          {
            day: 1,
            title: "GenAI Overview",
            duration: "30 min",
            keywords: ["genai"],
            concepts: ["LLMs", "Diffusion", "Use cases"],
          },
          {
            day: 2,
            title: "Prompt Engineering",
            duration: "26 min",
            keywords: ["prompt"],
            concepts: ["Prompt patterns", "Evaluation", "Guardrails"],
          },
          {
            day: 3,
            title: "RAG Systems",
            duration: "34 min",
            keywords: ["rag"],
            concepts: ["Retrieval", "Context", "Citations"],
          },
          {
            day: 4,
            title: "Model Evaluation",
            duration: "28 min",
            keywords: ["evaluation"],
            concepts: ["Quality", "Bias", "Safety"],
          },
          {
            day: 5,
            title: "Deployment",
            duration: "24 min",
            keywords: ["deployment"],
            concepts: ["Monitoring", "Cost", "Latency"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "genai-1",
        type: "Lecture Notes",
        title: "GenAI Patterns",
        description: "Prompt and system design patterns.",
        size: "960 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "gen-q1",
            type: "multiple",
            prompt: "RAG stands for:",
            options: ["Retrieval Augmented Generation", "Response Automated Graph", "Ranked Attention Grid", "Random Augment Generator"],
            answer: "Retrieval Augmented Generation",
          },
          {
            id: "gen-q2",
            type: "boolean",
            prompt: "GenAI models can be fine-tuned.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "full-stack-development",
    title: "Full Stack Development",
    instructor: "Meera Iyer",
    rating: 4.7,
    students: 65500,
    category: "Full Stack Development",
    level: "Intermediate",
    image: "/course/fullstack-2026.svg",
    symbol: "Code",
    description: "Build full-stack systems with modern UI, APIs, and scalable databases.",
    skills: ["React", "APIs", "Databases"],
    stages: [
      {
        title: "Full Stack Core",
        days: [
          {
            day: 1,
            title: "Full Stack Overview",
            duration: "26 min",
            keywords: ["stack"],
            concepts: ["Client", "Server", "Database"],
          },
          {
            day: 2,
            title: "Frontend Architecture",
            duration: "30 min",
            keywords: ["frontend"],
            concepts: ["State", "Routing", "Design systems"],
          },
          {
            day: 3,
            title: "Backend APIs",
            duration: "34 min",
            keywords: ["backend"],
            concepts: ["REST", "Auth", "Validation"],
          },
          {
            day: 4,
            title: "Databases",
            duration: "28 min",
            keywords: ["db"],
            concepts: ["Schemas", "Indexes", "ORM"],
          },
          {
            day: 5,
            title: "Deployment",
            duration: "24 min",
            keywords: ["deploy"],
            concepts: ["CI/CD", "Hosting", "Monitoring"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "fs-1",
        type: "Assignment",
        title: "Full Stack Project Plan",
        description: "Plan and scope a production build.",
        size: "880 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "fs-q1",
            type: "multiple",
            prompt: "Which layer handles business logic?",
            options: ["Client", "Server", "CDN", "Cache"],
            answer: "Server",
          },
          {
            id: "fs-q2",
            type: "boolean",
            prompt: "Databases store application state.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "devops-engineering",
    title: "DevOps Engineering",
    instructor: "Devansh Kulkarni",
    rating: 4.8,
    students: 48800,
    category: "DevOps Engineering",
    level: "Intermediate",
    image: "/course/devops-2026.svg",
    symbol: "Server",
    description: "Automate delivery, ensure reliability, and scale infrastructure.",
    skills: ["CI/CD", "Kubernetes", "Observability"],
    stages: [
      {
        title: "DevOps Core",
        days: [
          {
            day: 1,
            title: "DevOps Fundamentals",
            duration: "28 min",
            keywords: ["devops"],
            concepts: ["Automation", "Culture", "Pipelines"],
          },
          {
            day: 2,
            title: "CI/CD Pipelines",
            duration: "32 min",
            keywords: ["cicd"],
            concepts: ["Build", "Test", "Deploy"],
          },
          {
            day: 3,
            title: "Infrastructure as Code",
            duration: "30 min",
            keywords: ["iac"],
            concepts: ["Terraform", "Modules", "State"],
          },
          {
            day: 4,
            title: "Monitoring",
            duration: "26 min",
            keywords: ["monitoring"],
            concepts: ["SLIs", "SLOs", "Alerts"],
          },
          {
            day: 5,
            title: "Reliability",
            duration: "24 min",
            keywords: ["reliability"],
            concepts: ["Incident response", "Postmortems", "Chaos testing"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "devops-1",
        type: "Lecture Notes",
        title: "DevOps Runbook",
        description: "Release, monitoring, and escalation checklist.",
        size: "680 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "dev-q1",
            type: "multiple",
            prompt: "CI stands for:",
            options: ["Continuous Integration", "Cloud Infrastructure", "Critical Incident", "Code Inspection"],
            answer: "Continuous Integration",
          },
          {
            id: "dev-q2",
            type: "boolean",
            prompt: "CI/CD automates software delivery.",
            answer: "true",
          },
        ],
      },
    ],
  },
  {
    slug: "data-engineering",
    title: "Data Engineering",
    instructor: "Zoya Malik",
    rating: 4.7,
    students: 39200,
    category: "Data Science",
    level: "Advanced",
    image: "/course/dataeng-2026.svg",
    symbol: "Database",
    description: "Design pipelines, data lakes, and streaming systems.",
    skills: ["Pipelines", "Streaming", "Data Warehousing"],
    stages: [
      {
        title: "Data Pipelines",
        days: [
          {
            day: 1,
            title: "Pipeline Architecture",
            duration: "26 min",
            keywords: ["pipelines"],
            concepts: ["Ingestion", "Transformation", "Storage"],
          },
          {
            day: 2,
            title: "Batch vs Stream",
            duration: "28 min",
            keywords: ["stream"],
            concepts: ["Latency", "Throughput", "Tools"],
          },
          {
            day: 3,
            title: "Data Quality",
            duration: "24 min",
            keywords: ["quality"],
            concepts: ["Validation", "Observability", "SLAs"],
          },
          {
            day: 4,
            title: "Warehousing",
            duration: "30 min",
            keywords: ["warehouse"],
            concepts: ["Schemas", "Partitioning", "Cost"],
          },
          {
            day: 5,
            title: "Orchestration",
            duration: "22 min",
            keywords: ["orchestration"],
            concepts: ["Schedulers", "Retries", "Monitoring"],
          },
        ],
      },
    ],
    materials: [
      {
        id: "de-1",
        type: "Practice",
        title: "Pipeline Checklist",
        description: "Operational checklist for pipelines.",
        size: "560 KB",
      },
    ],
    exams: [
      {
        day: 1,
        durationMinutes: 10,
        questions: [
          {
            id: "de-q1",
            type: "multiple",
            prompt: "Ingestion refers to:",
            options: ["Data removal", "Data collection", "Data visualization", "Data deletion"],
            answer: "Data collection",
          },
          {
            id: "de-q2",
            type: "boolean",
            prompt: "Streaming systems prioritize low latency.",
            answer: "true",
          },
        ],
      },
    ],
  },
];

export function getCourseBySlug(slug: string) {
  return courses.find((course) => course.slug === slug) || null;
}

export function getFeaturedCourses(limit = 10) {
  return courses.slice(0, limit);
}
