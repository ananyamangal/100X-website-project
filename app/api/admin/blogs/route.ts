import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { BlogInput } from '@/lib/blogModel';

// GET - Fetch all blog posts
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blogs = await db
      .collection('blogs')
      .aggregate([
        { $match: {} },
        {
          $addFields: {
            orderSort: { $ifNull: ['$order', Number.MAX_SAFE_INTEGER] },
          },
        },
        { $sort: { orderSort: 1, publishedAt: -1 } },
        { $project: { orderSort: 0 } },
      ])
      .toArray();
    
    return NextResponse.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 });
  }
}

// POST - Create a new blog post
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blogData: BlogInput = await request.json();
    
    // Set default values
    const newBlog: any = {
      ...blogData,
      inlineImages: blogData.inlineImages || [], // Ensure inlineImages is an array
      publishedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (typeof blogData.order === 'number') {
      newBlog.order = blogData.order;
    } else {
      delete newBlog.order;
    }
    
    const result = await db.collection('blogs').insertOne(newBlog);
    
    return NextResponse.json({
      ...newBlog,
      _id: result.insertedId
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json({ error: 'Failed to create blog' }, { status: 500 });
  }
}
