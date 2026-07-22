import SignInFormClient from "@/modules/auth/components/sign-in-form-client";
import Image from "next/image";
import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 sm:p-6">
      <Image
        src={"/login.svg"}
        alt="Login-Image"
        width={300}
        height={300}
        className="h-64 sm:h-72 md:h-80 w-auto"
        priority
      />

      <SignInFormClient />
    </div>
  );
};

export default Page;
