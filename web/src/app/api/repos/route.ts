import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUserRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repos = await listUserRepos(session.accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch repos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
