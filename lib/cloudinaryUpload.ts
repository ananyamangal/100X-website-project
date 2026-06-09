const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6"
const DEFAULT_PRESET = "product_uploads"

export async function uploadToCloudinary(
  file: File,
  resourceType: "image" | "video" = "image",
  preset = DEFAULT_PRESET
): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("upload_preset", preset)
  const res = await fetch(`${CLOUDINARY_URL}/${resourceType}/upload`, { method: "POST", body: fd })
  if (!res.ok) throw new Error("Cloudinary upload failed")
  const data = await res.json()
  if (!data.secure_url) throw new Error("No secure_url returned")
  return data.secure_url as string
}
