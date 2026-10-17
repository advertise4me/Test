import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/crypto";
import { MetaApiError, uploadAdImage, uploadAdVideo } from "@/mcp-server/meta-client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB, Meta's own adimages limit
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1GB, generous ceiling - Meta enforces its own limits too

// Uploads an image or video straight to Meta (never stored on our own disk
// or database) and hands back the reference (image hash / video id) Claude
// needs to build an ad creative. This does not go through the chat tool-use
// loop - Claude can't invent file bytes, so the upload happens here and the
// resulting reference is surfaced to the chat as plain text.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }

  const connection = await prisma.metaConnection.findUnique({ where: { userId } });
  if (!connection) {
    return NextResponse.json({ error: "Connect a Meta ad account first." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only image or video files are supported." }, { status: 400 });
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).` },
      { status: 400 },
    );
  }

  const metaAccessToken = decryptToken(connection.accessTokenCiphertext);
  const config = { accessToken: metaAccessToken, adAccountId: connection.adAccountId };
  const uploadedFile = {
    filename: file.name || (isImage ? "upload.jpg" : "upload.mp4"),
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()),
  };

  try {
    if (isImage) {
      const { hash } = await uploadAdImage(config, uploadedFile);
      return NextResponse.json({ kind: "image", ref: hash, filename: uploadedFile.filename });
    }
    const { videoId } = await uploadAdVideo(config, uploadedFile);
    return NextResponse.json({ kind: "video", ref: videoId, filename: uploadedFile.filename });
  } catch (error) {
    const message = error instanceof MetaApiError ? error.message : "Could not upload this file to Meta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
