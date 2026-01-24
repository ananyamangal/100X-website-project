import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface Accreditation {
  _id?: string;
  logo: string;
  order: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AccreditationInput {
  logo: string;
  order?: number;
  isActive?: boolean;
}

// GET - Fetch all accreditations
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const accreditations = await db.collection('accreditations')
      .find({})
      .sort({ order: 1 })
      .toArray();
    
    return NextResponse.json(accreditations);
  } catch (error) {
    console.error('Error fetching accreditations:', error);
    return NextResponse.json({ error: 'Failed to fetch accreditations' }, { status: 500 });
  }
}

// POST - Create a new accreditation
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const accreditationData: AccreditationInput = await request.json();
    
    // Set default values
    const newAccreditation = {
      ...accreditationData,
      isActive: accreditationData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // If no order is specified, set it to the next available order
    if (!newAccreditation.order) {
      const maxOrderAccreditation = await db.collection('accreditations')
        .find({})
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      
      newAccreditation.order = maxOrderAccreditation.length > 0 ? maxOrderAccreditation[0].order + 1 : 0;
    } else {
      // If order is specified, shift existing accreditations
      await db.collection('accreditations').updateMany(
        { order: { $gte: newAccreditation.order } },
        { $inc: { order: 1 } }
      );
    }
    
    const result = await db.collection('accreditations').insertOne(newAccreditation);
    
    return NextResponse.json({
      ...newAccreditation,
      _id: result.insertedId
    });
  } catch (error) {
    console.error('Error creating accreditation:', error);
    return NextResponse.json({ error: 'Failed to create accreditation' }, { status: 500 });
  }
}

