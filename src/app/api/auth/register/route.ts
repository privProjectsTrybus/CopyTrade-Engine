// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditIpHash } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const rateLimitOk = await checkRateLimit(`register:${ip}`, 5, 60 * 60);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Avoid confirming whether an email exists
    return NextResponse.json(
      { error: "Unable to create account with provided details." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      notificationSettings: {
        create: {},
      },
      riskProfile: {
        create: {}, // defaults from schema: 30/1/3/7/12 etc.
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ACCOUNT_CREATED",
      ipHash: auditIpHash(ip),
    },
  });

  return NextResponse.json({ success: true });
}
