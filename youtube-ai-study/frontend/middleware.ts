import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/dashboard(.*)",
  "/learning-hub(.*)",
  "/course(.*)",
  "/study-materials(.*)",
  "/library(.*)",
  "/leaderboard(.*)",
  "/summarize(.*)",
  "/notes(.*)",
  "/ask(.*)",
  "/chapters(.*)",
  "/quiz(.*)",
  "/api/admin(.*)",
  "/api/video/process",
  "/api/qa/ask",
  "/api/courses(.*)",
  "/api/quiz(.*)",
  "/api/exams(.*)",
  "/api/library(.*)",
  "/api/leaderboard(.*)",
  "/api/dashboard(.*)",
  "/api/enrollments(.*)",
  "/api/pdf(.*)",
  "/api/videos(.*)",
  "/api/user(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect({ unauthenticatedUrl: new URL("/sign-in", req.url).toString() });
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
