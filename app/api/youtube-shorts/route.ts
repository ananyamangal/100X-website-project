import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    return NextResponse.json({ error: 'Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID in environment.' }, { status: 500 });
  }

  try {
    // Get uploads playlist ID
    const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return NextResponse.json({ error: 'Could not find uploads playlist.' }, { status: 500 });
    }

    // Get latest 20 videos
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=20&playlistId=${uploadsPlaylistId}&key=${apiKey}`);
    const playlistData = await playlistRes.json();
    const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId);

    // Just return the latest 5 video IDs (no duration filter)
    return NextResponse.json(videoIds.slice(0, 5));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch YouTube Shorts', details: String(error) }, { status: 500 });
  }
} 