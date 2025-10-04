import { NextRequest, NextResponse } from 'next/server';
import { clientPromise } from '@/lib/mongodb';
import { BlogInput } from '@/lib/blogModel';

// GET - Fetch all blog posts
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blogs = await db.collection('blogs')
      .find({})
      .sort({ publishedAt: -1 })
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
    const newBlog = {
      ...blogData,
      publishedAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
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
