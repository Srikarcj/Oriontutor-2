import fs from "fs";
import path from "path";
import vm from "vm";
import { createRequire } from "module";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

function loadCourseData() {
  const filePath = path.resolve(process.cwd(), "lib", "course-data.ts");
  const raw = fs.readFileSync(filePath, "utf-8");
  let src = raw;
  src = src.replace(/export type[\s\S]*?;\n\n/g, "");
  src = src.replace(/export const /g, "const ");
  src = src.replace(/export function /g, "function ");
  src = src.replace(/const\s+courses:\s*[^=]+=/g, "const courses =");
  src = src.replace(/\)\s*:\s*[^ {]+/g, ")");
  src = src.replace(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g, (match, name, params) => {
    const cleaned = params
      .split(",")
      .map((part) => part.replace(/:\s*[^,]+/g, "").trim())
      .join(", ");
    return `function ${name}(${cleaned})`;
  });
  src += "\nmodule.exports = { courses, courseCategories };";

  const module = { exports: {} };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(src, { module, exports: module.exports, require });
  return module.exports;
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { courses } = loadCourseData();

  for (const course of courses) {
    const coursePayload = {
      slug: course.slug,
      title: course.title,
      instructor: course.instructor,
      rating: course.rating,
      students: course.students,
      category: course.category,
      level: course.level,
      description: course.description,
      image_url: course.image,
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("courses")
      .upsert(coursePayload, { onConflict: "slug" })
      .select("id")
      .single();

    if (upsertError) {
      console.error("Failed to upsert course:", course.slug, upsertError);
      continue;
    }

    const courseId = upserted.id;

    await supabase.from("course_stages").delete().eq("course_id", courseId);
    await supabase.from("course_lessons").delete().eq("course_id", courseId);
    await supabase.from("course_materials").delete().eq("course_id", courseId);

    let stagePosition = 0;
    for (const stage of course.stages) {
      const { data: stageRow, error: stageError } = await supabase
        .from("course_stages")
        .insert({
          course_id: courseId,
          title: stage.title,
          position: stagePosition++,
        })
        .select("id")
        .single();

      if (stageError) {
        console.error("Failed to insert stage:", course.slug, stage.title, stageError);
        continue;
      }

      for (const day of stage.days) {
        await supabase.from("course_lessons").insert({
          course_id: courseId,
          stage_id: stageRow.id,
          day_number: day.day,
          title: day.title,
          duration: day.duration,
          keywords: day.keywords,
          summary: day.concepts?.[0] || null,
          content: day.concepts?.join(". ") || "",
        });
      }
    }

    for (const material of course.materials) {
      await supabase.from("course_materials").insert({
        course_id: courseId,
        material_type: material.type,
        title: material.title,
        description: material.description,
        size: material.size,
        url: material.url || null,
      });
    }

    for (const exam of course.exams) {
      const { data: lessonRow } = await supabase
        .from("course_lessons")
        .select("id")
        .eq("course_id", courseId)
        .eq("day_number", exam.day)
        .maybeSingle();

      if (!lessonRow) continue;

      await supabase.from("lesson_quizzes").delete().eq("lesson_id", lessonRow.id);
      for (const question of exam.questions) {
        const options =
          question.type === "boolean" ? ["true", "false"] : question.options || [];
        await supabase.from("lesson_quizzes").insert({
          lesson_id: lessonRow.id,
          question_type: question.type,
          prompt: question.prompt,
          options,
          answer: question.answer,
          difficulty: "medium",
        });
      }
    }
  }

  console.log("Course seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
