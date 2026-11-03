import Link from "next/link";
import { APP_NAME } from "@/config/app";

export default function NotFound() {
  return (
    <div className="page">
      <p className="kicker">{APP_NAME}</p>
      <h1>404</h1>
      <Link href="/">Domov</Link>
    </div>
  );
}
