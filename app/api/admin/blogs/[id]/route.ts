import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { serializeBlog } from '@/lib/blogSerialize';

interface BlogUpdate {
  order?: number;
  title?: string;
  excerpt?: string;
  content?: string;
  topImage?: string;
  inlineImages?: string[];
  category?: string;
  author?: string;
  isPublished?: boolean;
}

// PUT - Update a blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const updateData: BlogUpdate = await request.json();
    
    const updatedAt = new Date();
    const updatedBlog: BlogUpdate & { updatedAt: Date } = {
      ...(typeof updateData.title === 'string' ? { title: updateData.title } : {}),
      ...(typeof updateData.excerpt === 'string' ? { excerpt: updateData.excerpt } : {}),
      ...(typeof updateData.content === 'string' ? { content: updateData.content } : {}),
      ...(typeof updateData.topImage === 'string' ? { topImage: updateData.topImage } : {}),
      ...(Array.isArray(updateData.inlineImages) ? { inlineImages: updateData.inlineImages } : {}),
      ...(typeof updateData.category === 'string' ? { category: updateData.category } : {}),
      ...(typeof updateData.author === 'string' ? { author: updateData.author } : {}),
      ...(typeof updateData.isPublished === 'boolean' ? { isPublished: updateData.isPublished } : {}),
      ...(typeof updateData.order === 'number' ? { order: updateData.order } : {}),
      updatedAt,
    };
    
    const result = await db.collection('blogs').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updatedBlog }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    
    const blog = await db.collection('blogs').findOne({ _id: new ObjectId(params.id) });
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json(serializeBlog(blog as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Failed to update blog' }, { status: 500 });
  }
}

// DELETE - Delete a blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection('blogs').deleteOne({
      _id: new ObjectId(params.id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json({ error: 'Failed to delete blog' }, { status: 500 });
  }
}
