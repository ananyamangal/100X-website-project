import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function normalize(text: string) {
    return text
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "")
}

// Order-independent fallback: a product renamed in admin (e.g. moving the
// model number from end to start) shouldn't break the existing SEO slug.
function tokenSig(text: string) {
    return text
        .toLowerCase()
        .replace(/&/g, "and")
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .sort()
        .join("|")
}

export async function GET(request: NextRequest, context: { params?: { slug?: string } }) {
    try {
        const params = await context.params;
        const slug = params?.slug;
        if (!slug) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }
        const client = await clientPromise;
        const db = client.db();
        const products = await db.collection("products").find().toArray()

        const slugNorm = normalize(slug);
        const slugSig = tokenSig(slug);
        const product =
            products.find(p => normalize(p.name) === slugNorm) ||
            products.find(p => tokenSig(p.name) === slugSig)

        if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Ensure imageUrls is always an array
        let imageUrls = [];
        if (Array.isArray(product.imageUrls)) {
            imageUrls = product.imageUrls;
        } else if (typeof product.imageUrls === 'string') {
            imageUrls = product.imageUrls.split(/\r?\n/).map((url: string) => url.trim()).filter((url: string) => url);
        } else if (product.imageUrl) {
            imageUrls = [product.imageUrl];
        } else if (product.image) {
            imageUrls = [product.image];
        }
        product.imageUrls = imageUrls;

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
    }
}