import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailTopBar } from "@/components/restaurant/DetailTopBar";
import { InfoCard } from "@/components/restaurant/InfoCard";
import { RestaurantHeader } from "@/components/restaurant/RestaurantHeader";
import { Reviews } from "@/components/restaurant/Reviews";
import { SocialLinks } from "@/components/restaurant/SocialLinks";
import { Status } from "@/components/ui/Status";
import { getRestaurant } from "@/lib/places";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await getRestaurant(decodeURIComponent((await params).id));
  return { title: r ? `${r.name} · Santayo` : "Restaurant · Santayo" };
}

export default function RestaurantPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Status>🍽️ Loading restaurant…</Status>}>
      <RestaurantDetails params={params} />
    </Suspense>
  );
}

async function RestaurantDetails({ params }: { params: Params }) {
  const r = await getRestaurant(decodeURIComponent((await params).id));
  if (!r) notFound();

  return (
    <main className="page page--detail">
      <DetailTopBar />
      <RestaurantHeader r={r} />
      <InfoCard r={r} />
      <Reviews reviews={r.reviews} rating={r.rating} count={r.reviewCount} demo={r.id.startsWith("demo.")} />
      <SocialLinks r={r} />
    </main>
  );
}
