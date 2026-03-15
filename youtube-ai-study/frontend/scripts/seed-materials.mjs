import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

function buildPdf(title, sections) {
  const lines = [
    title,
    "",
    ...sections.flatMap((section) => [
      section.label,
      ...section.items.map((item, idx) => `  ${idx + 1}. ${item}`),
      "",
    ]),
  ];
  const text = lines.join("\n").trim();
  const content = text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const header = "%PDF-1.4\n";
  const body =
    `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n` +
    `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n` +
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n` +
    `4 0 obj<< /Length ${content.length + 73} >>stream\nBT /F1 12 Tf 50 740 Td (${content}) Tj ET\nendstream\nendobj\n` +
    `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`;
  const xrefPosition = header.length + body.length;
  const xref =
    `xref\n0 6\n0000000000 65535 f \n` +
    `0000000009 00000 n \n` +
    `0000000058 00000 n \n` +
    `0000000111 00000 n \n` +
    `0000000242 00000 n \n` +
    `0000000380 00000 n \n`;
  const trailer = `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
  return Buffer.from(header + body + xref + trailer, "utf-8");
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const storage = supabase.storage.from("study-materials");

  const { data: courses } = await supabase.from("courses").select("id, slug");
  const bySlug = new Map((courses || []).map((c) => [c.slug, c.id]));

  const materials = [
    {
      slug: "web-development",
      title: "Programming Notes",
      description: "Core programming concepts, syntax patterns, and best practices.",
      size: "1.3 MB",
      path: "programming-notes.pdf",
      sections: [
        { label: "Foundations", items: ["Variables and types", "Control flow", "Functions and scope"] },
        { label: "Data Structures", items: ["Arrays and lists", "Stacks and queues", "Hash maps"] },
        { label: "Best Practices", items: ["Naming conventions", "Testing basics", "Debugging workflows"] },
      ],
    },
    {
      slug: "artificial-intelligence",
      title: "AI Fundamentals",
      description: "Key concepts, terminology, and system-level AI thinking.",
      size: "1.7 MB",
      path: "ai-fundamentals.pdf",
      sections: [
        { label: "Core Concepts", items: ["Narrow vs General AI", "Agents and environments", "Evaluation metrics"] },
        { label: "Learning Paradigms", items: ["Supervised learning", "Unsupervised learning", "Reinforcement learning"] },
        { label: "Ethics & Safety", items: ["Bias awareness", "Human oversight", "Responsible deployment"] },
      ],
    },
    {
      slug: "data-engineering",
      title: "Data Structures Essentials",
      description: "High-signal reference notes for common data structures.",
      size: "1.4 MB",
      path: "data-structures-essentials.pdf",
      sections: [
        { label: "Linear", items: ["Arrays", "Linked lists", "Stacks and queues"] },
        { label: "Trees", items: ["Binary trees", "Heaps", "Traversal patterns"] },
        { label: "Graphs", items: ["Graph representations", "BFS/DFS", "Shortest path"] },
      ],
    },
    {
      slug: "cyber-security",
      title: "Cyber Security Basics",
      description: "Threat models, defensive layers, and incident response.",
      size: "1.5 MB",
      path: "cyber-security-basics.pdf",
      sections: [
        { label: "Threat Landscape", items: ["Attack surface", "Phishing and social engineering", "Malware basics"] },
        { label: "Defense", items: ["Zero trust", "Network segmentation", "Patch management"] },
        { label: "Incident Response", items: ["Detection", "Containment", "Postmortems"] },
      ],
    },
  ];

  for (const material of materials) {
    const courseId = bySlug.get(material.slug);
    if (!courseId) continue;
    const buffer = buildPdf(material.title, material.sections);
    await storage.upload(material.path, buffer, { upsert: true, contentType: "application/pdf" });

    await supabase.from("course_materials").insert({
      course_id: courseId,
      material_type: "PDF",
      title: material.title,
      description: material.description,
      size: material.size,
      storage_path: material.path,
    });
  }

  console.log("Study materials seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
