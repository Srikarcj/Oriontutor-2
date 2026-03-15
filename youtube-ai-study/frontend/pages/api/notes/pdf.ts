import type { NextApiRequest, NextApiResponse } from "next";

function buildPdf(title: string, concepts: string[]) {
  const text = `${title}\n\n${concepts.map((c, idx) => `${idx + 1}. ${c}`).join("\n")}`;
  const content = text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const header = "%PDF-1.4\n";
  const body = `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n` +
    `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n` +
    `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n` +
    `4 0 obj<< /Length ${content.length + 73} >>stream\nBT /F1 16 Tf 50 740 Td (${content}) Tj ET\nendstream\nendobj\n` +
    `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`;
  const xrefPosition = header.length + body.length;
  const xref = `xref\n0 6\n0000000000 65535 f \n` +
    `0000000009 00000 n \n` +
    `0000000058 00000 n \n` +
    `0000000111 00000 n \n` +
    `0000000242 00000 n \n` +
    `0000000380 00000 n \n`;
  const trailer = `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;
  return header + body + xref + trailer;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const title = typeof req.body?.title === "string" ? req.body.title : "OrionTutor Notes";
  const concepts = Array.isArray(req.body?.concepts) ? req.body.concepts : [];
  const pdf = buildPdf(title, concepts);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=notes.pdf");
  res.status(200).send(Buffer.from(pdf, "utf-8"));
}
