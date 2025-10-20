import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const cameras = await prisma.camera.findMany();
  return NextResponse.json(cameras);
}

export async function POST(req: NextRequest) {
  const { name, ip, username, password, latitude, longitude } =
    await req.json();
  const camera = await prisma.camera.create({
    data: { name, ip, username, password, latitude, longitude },
  });
  return NextResponse.json(camera, { status: 201 });
}
