import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // 'image' or 'brochure'

  if (!file || !type) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = type === "brochure" ? ".pdf" : path.extname(file.name) || ".jpg";
  const folder = type === "brochure" ? "brochures" : "products";
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const filePath = path.join(process.cwd(), "public", folder, fileName);
  const publicUrl = `/${folder}/${fileName}`;

  // Ensure the folder exists
  await writeFile(filePath, buffer);

  return NextResponse.json({ url: publicUrl });
} 