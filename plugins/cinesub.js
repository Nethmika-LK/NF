
const { fetchJson } = require('../lib/functions')
const config = require('../config')
const axios = require('axios');
const { cmd, commands } = require('../command')


cmd({
    pattern: "ci",
    alias: ["cine"],
    react: "🎬",
    desc: "Search and download movies from CineSubz",
    category: "download",
    filename: __filename,
  }, async (conn, m, mek, { from, q, senderNumber, reply }) => {
    try {
    
      // Validate input query
      if (!q) {
        return await reply(
          "*𝑷𝒍𝒆𝒂𝒔𝒆 𝒑𝒓𝒐𝒗𝒊𝒅𝒆 𝒂 𝒎𝒐𝒗𝒊𝒆 𝒏𝒂𝒎𝒆 𝒕𝒐 𝒔𝒆𝒂𝒓𝒄𝒉! (𝒆.𝒈., 𝑨𝒗𝒂𝒕𝒂𝒓)*"
        );
      }
  
      // Step 1: Search movies from CineSubz API
      const searchResponse = await fetchJson(
        `https://deneth-dev-api-links.vercel.app/api/cinesubz-search?q=${encodeURIComponent(q)}&api_key=deneth2009`
      );
      const searchData = searchResponse;
  
      if (!searchData.status) {
        return await reply(`*No results found for:* "${q}"`);
      }
  
      const searchResults = searchData.result.data;
      let resultsMessage = `*Cinesubz serch* ✨"${q}":\n\n`;
  
      searchResults.forEach((result, index) => {
        resultsMessage += `*${index + 1}.* ${result.title} (${result.year})\nLink: ${result.link}\n\n`;
      });
  
      const sentMsg = await conn.sendMessage(
        from,
        { text: resultsMessage },
        { quoted: mek }
      );
      const messageID = sentMsg.key.id;
  
      // Step 2: Wait for the user to select a movie
      conn.ev.on("messages.upsert", async (messageUpdate) => {
        const replyMek = messageUpdate.messages[0];
        if (!replyMek.message) return;
  
        const messageType =
          replyMek.message.conversation ||
          replyMek.message.extendedTextMessage?.text;
  
        const isReplyToSentMsg =
          replyMek.message.extendedTextMessage &&
          replyMek.message.extendedTextMessage.contextInfo.stanzaId === messageID;
  
        if (isReplyToSentMsg) {
          const selectedNumber = parseInt(messageType.trim());
          if (
            !isNaN(selectedNumber) &&
            selectedNumber > 0 &&
            selectedNumber <= searchResults.length
          ) {
            const selectedMovie = searchResults[selectedNumber - 1];
  
            // Step 3: Fetch download links for the selected movie
            const movieResponse = await fetchJson(
              `https://deneth-dev-api-links.vercel.app/api/cinesubz-movie?url=${encodeURIComponent(
                selectedMovie.link
              )}&api_key=deneth2009`
            );
            const movieData = movieResponse;
  
            if (!movieData.status || !movieData.result.data.dl_links) {
              return await reply("*Error fetching download links for this movie.*");
            }
  
            const { title, imdbRate, image, date, country, duration, dl_links } =
              movieData.result.data;
  
            if (dl_links.length === 0) {
              return await reply(
                "*No download links available for this movie.*"
              );
            }
  
            let downloadMessage = `🎥 *${title}*\n\n`;
            downloadMessage += `⭐ *Rating:* ${imdbRate}\n📅 *Release Date:* ${date}\n🌍 *Country:* ${country}\n⏳ *Duration:* ${duration}\n`;
            downloadMessage += `*Available Download Links:*\n`;
  
            dl_links.forEach((link, index) => {
              downloadMessage += `*${index + 1}.* ${link.quality} - ${link.size}\n${link.link}\n\n`;
            });
           let download = dl_links;
            const sentDownloadMsg = await conn.sendMessage(
              from,
              {
                image: { url: image },
                caption: downloadMessage,
              },
              { quoted: replyMek }
            );
  
            const downloadMessageID = sentDownloadMsg.key.id;
  
            // Step 4: Wait for the user to select a download quality
            conn.ev.on("messages.upsert", async (downloadUpdate) => {
              const downloadReply = downloadUpdate.messages[0];
              if (!downloadReply.message) return;
  
              const downloadMessageType =
                downloadReply.message.conversation ||
                downloadReply.message.extendedTextMessage?.text;
  
              const isReplyToDownloadMsg =
                downloadReply.message.extendedTextMessage &&
                downloadReply.message.extendedTextMessage.contextInfo.stanzaId ===
                  downloadMessageID;
  
              if (isReplyToDownloadMsg) {
                const selectedQuality = parseInt(downloadMessageType.trim());
                if (
                  !isNaN(selectedQuality) &&
                  selectedQuality > 0 &&
                  selectedQuality <= download.length
                ) {
                  const selectedLink = download[selectedQuality - 1];
                  const movieLinkResponse = await fetchJson(
                    `https://apicine-api.vercel.app/api/cinesubz/download?url=${encodeURIComponent(
                      selectedLink.link
                    )}&apikey=test`
                  );
                  const movieLinkData = movieLinkResponse;
  
  
                  const downloadUrl = movieLinkData.result.direct;
                  await conn.sendMessage(from, { react: { text: '⬆️', key: mek.key } });
                                
                  await conn.sendMessage(
                    from,
                    {
                      document: { url: downloadUrl },
                      mimetype: "video/mp4",
                      fileName: `${title} - ${selectedLink.quality}.mp4`,
                      caption: `🥺`,
                    },
                    { quoted: downloadReply }

                  await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
                } else {
                  await reply("Invalid selection. Please reply with a valid number.");
                }
              }
            });
          } else {
            await reply("Invalid selection. Please reply with a valid number.");
          }
        }
      });
    } catch (e) {
      console.error("Error during CineSubz command execution:", e);
      reply("*An error occurred while processing your request.*");
    }
  });
  
