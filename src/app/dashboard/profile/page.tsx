import type { Metadata } from "next";

import { ProfileForm } from "@/app/dashboard/profile/profile-form";
import { Card } from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireUser("/dashboard/profile");
  const profile = await getProfile();

  if (!profile) {
    return (
      <Card>
        <p className="text-sm text-muted">
          We couldn&apos;t load your profile. Try signing out and back in.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-muted">Update how your name and details appear.</p>
      </header>

      <Card className="p-7">
        <ProfileForm profile={profile} />
      </Card>

      <Card className="space-y-2">
        <h2 className="font-medium">Account</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Member since</dt>
            <dd>{formatDate(profile.created_at)}</dd>
          </div>
        </dl>
        <p className="pt-2 text-xs text-muted">
          To change your email address or password, use the sign-in options on the login page.
        </p>
      </Card>
    </div>
  );
}
