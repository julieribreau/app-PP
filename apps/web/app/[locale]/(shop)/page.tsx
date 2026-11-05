import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FeaturedProducts } from "@/components/shop/FeaturedProducts";
import { HeroArt } from "@/components/shop/HeroArt";
import { Link } from "@/i18n/navigation";

function Step({ n, title, body }: { readonly n: string; readonly title: string; readonly body: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-[24px] border border-border bg-background p-8">
      <span className="font-numeric text-[32px] leading-10 font-medium text-primary">{n}</span>
      <h3 className="m-0 text-xl leading-7 font-semibold">{title}</h3>
      <p className="m-0 text-muted-foreground">{body}</p>
    </article>
  );
}

// Vitrine : le produit sera présenté plus tard, les textes provisoires sont entre crochets.
export default function HomePage() {
  const t = useTranslations("landing");
  return (
    <main>
      <section className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-12 px-6 pt-[72px] pb-[88px] md:px-12">
        <div className="flex flex-col gap-6">
          <span className="overline">{t("overline")}</span>
          <h1 className="display m-0 text-5xl leading-[1.06] md:text-[64px]">{t("title")}</h1>
          <p className="m-0 max-w-[520px] text-lg leading-7 text-muted-foreground">{t("lead")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild><Link href="/boutique">{t("cta")}</Link></Button>
            <Button asChild variant="outline"><Link href="/#approche">{t("ctaSecondary")}</Link></Button>
          </div>
        </div>
        <HeroArt />
      </section>
      <section id="approche" className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-6 py-20 md:px-12">
          <div className="flex max-w-[640px] flex-col gap-3">
            <span className="overline">{t("approachOverline")}</span>
            <h2 className="display m-0 text-[40px] leading-[44px]">{t("approachTitle")}</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-6">
            <Step n="01" title={t("step1Title")} body={t("step1Body")} />
            <Step n="02" title={t("step2Title")} body={t("step2Body")} />
            <Step n="03" title={t("step3Title")} body={t("step3Body")} />
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-20 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <span className="overline">{t("featuredOverline")}</span>
            <h2 className="display m-0 text-[40px] leading-[44px]">{t("featuredTitle")}</h2>
          </div>
          <Button asChild variant="outline"><Link href="/boutique">{t("seeAll")}</Link></Button>
        </div>
        <FeaturedProducts />
      </section>
      <section className="mx-auto mb-20 max-w-[1280px] px-6 md:px-12">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[24px] bg-secondary px-8 py-10 text-secondary-foreground md:px-12">
          <div className="flex max-w-[640px] flex-col gap-2">
            <h2 className="display m-0 text-[28px] leading-[34px]">{t("payBannerTitle")}</h2>
            <p className="m-0">{t("payBannerBody")}</p>
          </div>
          <Button asChild><Link href="/boutique">{t("payBannerCta")}</Link></Button>
        </div>
      </section>
    </main>
  );
}
