import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import Image from "next/image";

export default async function Home() {
  const user = db.user;
  return (
    <div>
      <Button>Get Started.</Button>
    </div>
  );
}
