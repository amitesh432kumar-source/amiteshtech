import { NextResponse, type NextRequest } from "next/server";

import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { StudentRegistration } from "@/lib/supabase/types";

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const country = searchParams.get("country");
  const state = searchParams.get("state");
  const city = searchParams.get("city");

  const supabase = await createClient();
  let query = supabase.from("student_registrations").select("*");

  if (q) {
    const term = q.replace(/[%,()]/g, " ").trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,mobile_number.ilike.%${term}%`);
  }
  if (country) query = query.eq("country", country);
  if (state) query = query.eq("state", state);
  if (city) query = query.eq("city", city);

  const { data } = await query.order("created_at", { ascending: false }).limit(10000);
  const rows = (data ?? []) as StudentRegistration[];

  const header = [
    "Registration ID",
    "Full name",
    "Email",
    "Mobile number",
    "Country",
    "State",
    "City",
    "Registered at",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        `AT-${String(row.seq_no).padStart(6, "0")}`,
        row.full_name,
        row.email,
        row.mobile_number,
        row.country,
        row.state,
        row.city,
        formatDateTime(row.created_at),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-registrations-${Date.now()}.csv"`,
    },
  });
}
