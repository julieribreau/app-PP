import type { Profile } from "@/lib/api/types";

/** Photo de profil, ou initiales sur fond pêche. Décorative : le nom est affiché à côté. */
export function Avatar({ profile, size = 48 }: { readonly profile: Pick<Profile, "firstName" | "lastName" | "email" | "imageUrl">; readonly size?: number }) {
  const initials = [profile.firstName, profile.lastName]
    .map((s) => s?.trim()[0] ?? "")
    .join("")
    .toUpperCase() || profile.email[0]?.toUpperCase();
  const style = { width: size, height: size };
  if (profile.imageUrl) {
    return <img src={profile.imageUrl} alt="" aria-hidden="true" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden="true" style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-peach text-lg font-semibold text-foreground">
      {initials}
    </span>
  );
}
