import { Suspense } from "react";
import AuthorLoginComponent from "./AuthorLoginComponent";

export const metadata = {
  title: "Admin Login - IskyMD",
  description: "Secure access portal for administrators",
};

export default function AuthorLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen cyber-theme author-theme cyber-mesh flex items-center justify-center">
        <div className="text-[#F0D77A] font-mono text-xl animate-pulse tracking-[0.5em] font-bold">
          LOADING...
        </div>
      </div>
    }>
      <AuthorLoginComponent />
    </Suspense>
  );
}
