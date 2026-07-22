import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import UserButton from "@/modules/auth/components/user-button";
import Image from "next/image";

export default async function Home() {
  const user = db.user;
  return (
    <div>
      <Button>Get Started.</Button>
      <UserButton />
    </div>
  );
}
