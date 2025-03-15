const express = require('express');
const { ytmp3, ytmp4 } = require('kenz-scraper');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function youtubeSearch(query) {
  try {
    const baseUrl = 'https://www.youtube.com/results';
    const params = new URLSearchParams({
      search_query: query,
      sp: 'CAASAhAB'
    });

    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    let initialData;

    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.includes('var ytInitialData = ')) {
        const match = scriptContent.match(/var ytInitialData = (.+?)};/);
        if (match && match[1]) {
          try {
            initialData = JSON.parse(match[1] + '}');
          } catch (e) {}
        }
      }
    });

    if (initialData && initialData.contents && 
        initialData.contents.twoColumnSearchResultsRenderer && 
        initialData.contents.twoColumnSearchResultsRenderer.primaryContents && 
        initialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer && 
        initialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents) {

      const contents = initialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;

      contents.forEach(content => {
        if (content.itemSectionRenderer && content.itemSectionRenderer.contents) {
          content.itemSectionRenderer.contents.forEach(item => {
            if (item.videoRenderer) {
              const video = item.videoRenderer;

              let title = '';
              if (video.title && video.title.runs && video.title.runs[0]) {
                title = video.title.runs[0].text;
              }

              let videoId = video.videoId;
              let url = `https://www.youtube.com/watch?v=${videoId}`;

              let thumbnail = '';
              if (video.thumbnail && video.thumbnail.thumbnails && video.thumbnail.thumbnails[0]) {
                thumbnail = video.thumbnail.thumbnails[0].url;
              }

              let channelName = '';
              if (video.ownerText && video.ownerText.runs && video.ownerText.runs[0]) {
                channelName = video.ownerText.runs[0].text;
              }

              let viewCount = '';
              if (video.viewCountText && video.viewCountText.simpleText) {
                viewCount = video.viewCountText.simpleText;
              }

              let publishedTime = '';
              if (video.publishedTimeText && video.publishedTimeText.simpleText) {
                publishedTime = video.publishedTimeText.simpleText;
              }

              let duration = '';
              if (video.lengthText && video.lengthText.simpleText) {
                duration = video.lengthText.simpleText;
              }

              if (title && videoId) {
                results.push({
                  title,
                  url,
                  videoId,
                  thumbnail,
                  channelName,
                  viewCount,
                  publishedTime,
                  duration
                });
              }
            }
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ 
        status: false,
        message: 'Search query is required (use ?q=your search term)'
      });
    }

    const results = await youtubeSearch(query);

    return res.json({
      status: true,
      query,
      count: results.length,
      results
    });
  } catch (error) {
    return res.status(500).json({ 
      status: false,
      message: 'An error occurred during the search' 
    });
  }
});

app.get('/api/ytmp3', async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ 
        status: false,
        message: 'URL parameter is required (use ?url=youtube_video_url)'
      });
    }

    const data = await ytmp3(url);

    return res.json({
      status: true,
      result: data
    });
  } catch (error) {
    return res.status(500).json({ 
      status: false,
      message: 'An error occurred during audio extraction' 
    });
  }
});

app.get('/api/ytmp4', async (req, res) => {
  try {
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ 
        status: false,
        message: 'URL parameter is required (use ?url=youtube_video_url)'
      });
    }

    const data = await ytmp4(url);

    return res.json({
      status: true,
      result: data
    });
  } catch (error) {
    return res.status(500).json({ 
      status: false,
      message: 'An error occurred during video extraction' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube API server running on port ${PORT}`);
});

module.exports = app;