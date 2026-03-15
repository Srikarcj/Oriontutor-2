import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = typeof ctx.params?.slug === "string" ? ctx.params.slug : "";
  return {
    redirect: {
      destination: slug ? `/learning/${slug}` : "/learning",
      permanent: false,
    },
  };
};

export default function LearningEnrollPage() {
  return null;
}
