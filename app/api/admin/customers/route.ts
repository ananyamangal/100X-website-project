import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface CustomerInput {
  logo: string;
  order?: number;
  isActive?: boolean;
}

// GET - Fetch all customers
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const customers = await db.collection('customers')
      .find({})
      .sort({ order: 1 })
      .toArray();
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const customerData: CustomerInput = await request.json();
    
    const newCustomer = {
      ...customerData,
      isActive: customerData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!newCustomer.order) {
      const maxOrder = await db.collection('customers')
        .find({})
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      newCustomer.order = maxOrder.length > 0 ? maxOrder[0].order + 1 : 0;
    } else {
      await db.collection('customers').updateMany(
        { order: { $gte: newCustomer.order } },
        { $inc: { order: 1 } }
      );
    }
    
    const result = await db.collection('customers').insertOne(newCustomer);
    return NextResponse.json({
      ...newCustomer,
      _id: result.insertedId
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
