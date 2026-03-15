import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/ask",
    permanent: false,
  },
});

export default function AskAliasPage() {
  return null;
}
