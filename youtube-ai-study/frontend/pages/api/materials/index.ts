import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/server/db";
import { getSupabaseAdmin } from "../../../lib/server/supabase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getDb();
  const { data: materials, error } = await db
    .from("course_materials")
    .select("id, title, description, size, material_type, storage_path, url, course_id");

  if (error) return res.status(500).json({ error: "Failed to load materials" });

  const courseIds = Array.from(new Set((materials || []).map((m: any) => m.course_id)));
  const { data: courses } = await db
    .from("courses")
    .select("id, title, slug, category")
    .in("id", courseIds);
  const courseById = new Map<string, any>();
  (courses || []).forEach((c: any) => courseById.set(c.id, c));

  const storage = getSupabaseAdmin().storage.from("study-materials");

  const items = await Promise.all(
    (materials || []).map(async (material: any) => {
      let signed_url: string | null = null;
      if (material.storage_path) {
        const { data } = await storage.createSignedUrl(material.storage_path, 60 * 60);
        signed_url = data?.signedUrl || null;
      }
      const course = courseById.get(material.course_id);
      return {
        id: material.id,
        title: material.title,
        description: material.description,
        size: material.size,
        type: material.material_type,
        url: material.url,
        signed_url,
        course: course?.title || "General",
        slug: course?.slug || "",
        category: course?.category || "",
      };
    })
  );

  return res.status(200).json({ items });
}
