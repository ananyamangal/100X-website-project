import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'about_page';

// GET - Admin: fetch about page content for editing
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('about_page').findOne({ key: KEY });
    const data = doc ? { ...doc, key: undefined, _id: undefined } : {};
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching about page:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// PUT - Admin: update about page content
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const update = {
      key: KEY,
      heroBadge: body.heroBadge,
      heroTitle: body.heroTitle,
      journeyHeading: body.journeyHeading,
      journeyParagraph1: body.journeyParagraph1,
      journeyList: body.journeyList,
      journeyParagraph2: body.journeyParagraph2,
      journeyStat1Value: body.journeyStat1Value,
      journeyStat1Label: body.journeyStat1Label,
      journeyStat2Value: body.journeyStat2Value,
      journeyStat2Label: body.journeyStat2Label,
      journeyImage: body.journeyImage,
      foundationHeading: body.foundationHeading,
      foundationSubtext: body.foundationSubtext,
      missionTitle: body.missionTitle,
      missionDescription: body.missionDescription,
      visionTitle: body.visionTitle,
      visionDescription: body.visionDescription,
      valuesTitle: body.valuesTitle,
      valuesDescription: body.valuesDescription,
      manufacturingHeading: body.manufacturingHeading,
      manufacturingParagraph: body.manufacturingParagraph,
      manufacturingStat1Value: body.manufacturingStat1Value,
      manufacturingStat1Label: body.manufacturingStat1Label,
      manufacturingStat2Value: body.manufacturingStat2Value,
      manufacturingStat2Label: body.manufacturingStat2Label,
      manufacturingStat3Value: body.manufacturingStat3Value,
      manufacturingStat3Label: body.manufacturingStat3Label,
      manufacturingStat4Value: body.manufacturingStat4Value,
      manufacturingStat4Label: body.manufacturingStat4Label,
      manufacturingImage: body.manufacturingImage,
      updatedAt: new Date(),
    };
    await db.collection('about_page').updateOne(
      { key: KEY },
      { $set: update },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving about page:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
