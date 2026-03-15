type ModuleContent = {
  id: string;
  title: string;
  explanation: string;
  concepts: string[];
  examples: string[];
  notes: string[];
};

type ModuleTopic = {
  titles: string[];
  concepts: string[];
  examples: string[];
  notes: string[];
};

const topicLibrary: Record<string, ModuleTopic> = {
  ai: {
    titles: [
      "What Is Artificial Intelligence",
      "History of Artificial Intelligence",
      "Applications of AI in Real Life",
      "AI vs Machine Learning",
      "Core AI Terminology",
      "Types of AI Systems",
      "Ethics and Responsible AI",
      "AI in Business Decisions",
      "AI in Healthcare",
      "AI in Consumer Products",
    ],
    concepts: ["Agents", "Inference", "Training Data", "Models", "Prediction", "Automation", "Bias", "Generalization"],
    examples: [
      "Voice assistants translating speech into actions.",
      "Recommendation systems personalizing content feeds.",
      "Fraud detection models flagging unusual transactions.",
    ],
    notes: ["Define AI in plain language.", "Differentiate AI, ML, and DL.", "Track real-world impact and risks."],
  },
  data: {
    titles: [
      "What Is Data Science",
      "Data Science Lifecycle",
      "Types of Data",
      "Tools Used in Data Science",
      "Exploratory Data Analysis",
      "Data Cleaning Basics",
      "Storytelling with Data",
      "Statistics for Decisions",
      "Data Pipelines Overview",
      "Model Evaluation",
    ],
    concepts: ["Structured vs Unstructured", "EDA", "Feature Engineering", "Sampling", "Visualization", "Hypothesis"],
    examples: [
      "Cleaning missing values before training a model.",
      "Using dashboards to communicate insights.",
      "Comparing A/B test outcomes statistically.",
    ],
    notes: ["Focus on clarity and data quality.", "Record assumptions with each analysis.", "Validate conclusions with metrics."],
  },
  cyber: {
    titles: [
      "Introduction to Cyber Security",
      "Types of Cyber Threats",
      "Malware and Phishing",
      "Security Fundamentals",
      "Authentication vs Authorization",
      "Network Security Basics",
      "Incident Response Overview",
      "Zero Trust Principles",
      "Security in the Cloud",
      "Security Awareness",
    ],
    concepts: ["Threat Modeling", "CIA Triad", "Attack Surface", "Least Privilege", "Encryption", "Monitoring"],
    examples: [
      "Phishing emails imitating official login pages.",
      "Ransomware encrypting shared drives.",
      "Multi-factor auth reducing account takeovers.",
    ],
    notes: ["Always verify identities.", "Patch early, patch often.", "Plan for incident response."],
  },
  web: {
    titles: [
      "How the Web Works",
      "HTML Foundations",
      "CSS Layout Systems",
      "JavaScript Essentials",
      "Responsive Design",
      "APIs and Fetching Data",
      "Web Performance",
      "Accessibility Basics",
      "Frontend Tooling",
      "Deployment Basics",
    ],
    concepts: ["DOM", "HTTP", "Layouts", "State", "Components", "Accessibility", "Performance Budgets"],
    examples: [
      "Building a responsive landing page.",
      "Fetching JSON from an API endpoint.",
      "Improving Lighthouse scores through lazy loading.",
    ],
    notes: ["Design mobile-first.", "Keep components reusable.", "Ship fast, iterate safely."],
  },
  cloud: {
    titles: [
      "Cloud Fundamentals",
      "IaaS, PaaS, SaaS",
      "Cloud Security Basics",
      "Compute and Storage",
      "Networking in the Cloud",
      "Cost Optimization",
      "Scaling Strategies",
      "Monitoring and Observability",
      "Disaster Recovery",
      "Cloud Governance",
    ],
    concepts: ["Regions", "Availability Zones", "Autoscaling", "IAM", "Cost Centers", "Reliability"],
    examples: [
      "Scaling a web app with autoscaling groups.",
      "Using object storage for backups.",
      "Setting alerts for cost spikes.",
    ],
    notes: ["Design for failure.", "Tag resources for tracking.", "Automate deployments."],
  },
  generic: {
    titles: [
      "Course Introduction",
      "Core Terminology",
      "Industry Applications",
      "Foundational Concepts",
      "Key Tools and Platforms",
      "Ethics and Best Practices",
      "Workflow Overview",
      "Common Pitfalls",
      "Metrics and Evaluation",
      "Next Steps",
    ],
    concepts: ["Foundations", "Workflow", "Best Practices", "Tools", "Metrics", "Real-world Usage"],
    examples: ["Applying the concept to a real project.", "Breaking down a case study."],
    notes: ["Start with the basics.", "Practice consistently.", "Document what you learn."],
  },
};

const topicAliases: Array<{ match: RegExp; key: keyof typeof topicLibrary }> = [
  { match: /artificial intelligence|ai|genai|machine learning/i, key: "ai" },
  { match: /data science|data|analytics|mlops/i, key: "data" },
  { match: /cyber|security|infosec/i, key: "cyber" },
  { match: /web|frontend|fullstack|ui|ux/i, key: "web" },
  { match: /cloud|devops|infra|kubernetes/i, key: "cloud" },
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickUnique(list: string[], count: number, seed: number) {
  if (!list.length) return [];
  const result: string[] = [];
  let cursor = seed % list.length;
  while (result.length < Math.min(count, list.length)) {
    const item = list[cursor];
    if (!result.includes(item)) result.push(item);
    cursor = (cursor + 3) % list.length;
  }
  return result;
}

function getTopicKey(courseTitle: string) {
  const match = topicAliases.find((item) => item.match.test(courseTitle));
  return match?.key || "generic";
}

export function buildDayModules(input: {
  courseTitle: string;
  courseSlug: string;
  dayTitle: string;
  dayNumber: number;
  moduleCount?: number;
}): ModuleContent[] {
  const { courseTitle, courseSlug, dayTitle, dayNumber, moduleCount = 4 } = input;
  const key = getTopicKey(courseTitle);
  const topic = topicLibrary[key] || topicLibrary.generic;
  const seed = hashString(`${courseSlug}-${dayNumber}-${dayTitle}`);

  const titles = pickUnique(topic.titles, moduleCount, seed);
  const concepts = pickUnique(topic.concepts, moduleCount + 2, seed + 7);
  const examples = pickUnique(topic.examples, 2, seed + 11);
  const notes = pickUnique(topic.notes, 2, seed + 19);

  return titles.map((title, index) => {
    const id = `${courseSlug}-${dayNumber}-${index}`;
    const conceptSet = concepts.slice(index, index + 3);
    return {
      id,
      title,
      explanation: `This module explains ${title.toLowerCase()} for ${courseTitle}. You'll connect it to ${dayTitle.toLowerCase()} and apply it to real scenarios.`,
      concepts: conceptSet.length ? conceptSet : topic.concepts.slice(0, 3),
      examples,
      notes: [
        `Relate ${title.toLowerCase()} to a real-world use case.`,
        `Capture key terms: ${conceptSet.join(", ") || "foundations, tools, metrics"}.`,
        ...notes,
      ],
    };
  });
}
