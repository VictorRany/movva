import Header from "@/components/Header";
import { IS_DEMO } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const supabase = await createClient();
  const { data: cities } = await supabase.from("cities").select("id, name, state").eq("active", true).order("name");
  return (<main><Header /><LoginForm plan={plan} cities={cities ?? []} demo={IS_DEMO} /></main>);
}
