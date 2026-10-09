import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const KEY = 'about_page';

const DEFAULT = {
  heroBadge: 'About Us',
  heroTitle: 'About 100X Circle Pvt Ltd',
  journeyHeading: 'Our Journey',
  journeyParagraph1: `100X Circle Pvt Ltd is India's fast-growing OEM of advanced fogging machines, agri implements, and airport ground equipment. Located at Sector 7, IMT Manesar, Gurgaon, we proudly uphold the 'Make in India' mission by delivering CE-certified, ISO 9001-compliant, and W.H.O-compliant solutions for both public and private sectors. Our brand '100X' stands for innovation, reliability, and scalable performance across segments`,
  journeyList: 'Thermal Fogging Machines (Portable & Vehicle-Mounted)\nBio-Foggers for sensitive applications\nMini Fogging Machines for compact operations\nComplete Agricultural Machinery line\nHeavy-duty Airport Baggage Trolleys',
  journeyParagraph2: 'Tested in approved labs, our machines are available and listed on the Government e-Marketplace (GeM) and widely used by defense forces, municipal bodies, and agriculture departments. 100X Circle is UDYAM/MSME registered and offers authorized dealership support across India.',
  journeyStat1Value: '2015',
  journeyStat1Label: 'Founded',
  journeyStat2Value: '10K+',
  journeyStat2Label: 'Happy customers',
  journeyImage: '/new.png',
  foundationHeading: 'Our Foundation',
  foundationSubtext: 'The principles that guide our work and define our commitment to excellence.',
  missionTitle: 'Mission',
  missionDescription: 'To empower customers with innovative, reliable, and affordable agricultural equipment that enhances productivity, reduces labor intensity, and contributes to sustainable farming practices.',
  visionTitle: 'Vision',
  visionDescription: 'To be the leading provider of agricultural equipment solutions, driving the transformation of farming practices through technology, innovation, and unwavering commitment to farmer success.',
  valuesTitle: 'Values',
  valuesDescription: 'Quality, integrity, innovation, and customer-centricity form the foundation of everything we do. We believe in building lasting relationships based on trust and mutual success.',
  manufacturingHeading: 'Manufacturing Excellence',
  manufacturingParagraph: 'Our state-of-the-art manufacturing facility combines traditional craftsmanship with modern technology to produce equipment of the highest quality. Every product undergoes rigorous testing to ensure durability and performance in real field conditions.',
  manufacturingStat1Value: 'ISO',
  manufacturingStat1Label: 'Certified',
  manufacturingStat2Value: '99.5%',
  manufacturingStat2Label: 'Quality Rate',
  manufacturingStat3Value: '24/7',
  manufacturingStat3Label: 'Production',
  manufacturingStat4Value: '50+',
  manufacturingStat4Label: 'Products',
  manufacturingImage: '/production.png',
};

// GET - Public: fetch about page content for the website
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection('about_page').findOne({ key: KEY });
    const data = doc ? { ...DEFAULT, ...doc, key: undefined } : DEFAULT;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching about page:', error);
    return NextResponse.json(DEFAULT);
  }
}
