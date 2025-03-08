const { fetchJson } = require('../lib/functions');
const config = require('../config');
const axios = require('axios');
const { cmd, commands } = require('../command');

cmd({
    pattern: "ci",
    alias: ["cine"],
    react: "🎬",
    desc: "Search and download movies from CineSubz",
    category: "download",
    filename: __filename,
}, async (conn, m, mek, { from, q, senderNumber, reply }) => {
    try {
        if (!q) {
            return await reply("*Please provide a movie name to search! (e.g., Avatar)*");
        }

      
        const searchResponse = await fetchJson(
            `https://deneth-dev-api-links.vercel.app/api/cinesubz-search?q=${encodeURIComponent(q)}&api_key=deneth2009`
        );

        if (!searchResponse.status) {
            return await reply(`*No results found for:* "${q}"`);
        }

        const searchResults = searchResponse.result.data;
        let resultsMessage = `🎬 *Cinesubz Search Results for:* "${q}"\n\n`;

        searchResults.forEach((result, index) => {
            resultsMessage += `*${index + 1}.* ${result.title} (${result.year})\n🔗 Link: ${result.link}\n\n`;
        });

        const sentMsg = await conn.sendMessage(from, { text: resultsMessage }, { quoted: mek });
        const messageID = sentMsg.key.id;

      
        conn.ev.on("messages.upsert", async (messageUpdate) => {
            const replyMek = messageUpdate.messages[0];
            if (!replyMek.message) return;

            const messageType =
                replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;

            const isReplyToSentMsg =
                replyMek.message.extendedTextMessage &&
                replyMek.message.extendedTextMessage.contextInfo.stanzaId === messageID;

            if (isReplyToSentMsg) {
                const selectedNumber = parseInt(messageType.trim());
                if (!isNaN(selectedNumber) && selectedNumber > 0 && selectedNumber <= searchResults.length) {
                    const selectedMovie = searchResults[selectedNumber - 1];

                   
                    const movieResponse = await fetchJson(
                        `https://deneth-dev-api-links.vercel.app/api/cinesubz-movie?url=${encodeURIComponent(
                            selectedMovie.link
                        )}&api_key=deneth2009`
                    );

                    if (!movieResponse.status || !movieResponse.result.data.dl_links) {
                        return await reply("*Error fetching download links for this movie.*");
                    }

                    const { title, imdbRate, image, date, country, duration, dl_links } = movieResponse.result.data;

                    if (dl_links.length === 0) {
                        return await reply("*No download links available for this movie.*");
                    }

                    let downloadMessage = `🎥 *${title}*\n\n`;
                    downloadMessage += `⭐ *Rating:* ${imdbRate}\n📅 *Release Date:* ${date}\n🌍 *Country:* ${country}\n⏳ *Duration:* ${duration}\n`;
                    downloadMessage += `*Available Download Links:*\n`;

                    dl_links.forEach((link, index) => {
                        downloadMessage += `*${index + 1}.* ${link.quality} - ${link.size}\n🔗 ${link.link}\n\n`;
                    });

                    const sentDownloadMsg = await conn.sendMessage(
                        from,
                        {
                            image: { url: image },
                            caption: downloadMessage,
                        },
                        { quoted: replyMek }
                    );

                    const downloadMessageID = sentDownloadMsg.key.id;

                    conn.ev.on("messages.upsert", async (downloadUpdate) => {
                        const downloadReply = downloadUpdate.messages[0];
                        if (!downloadReply.message) return;

                        const downloadMessageType =
                            downloadReply.message.conversation || downloadReply.message.extendedTextMessage?.text;

                        const isReplyToDownloadMsg =
                            downloadReply.message.extendedTextMessage &&
                            downloadReply.message.extendedTextMessage.contextInfo.stanzaId === downloadMessageID;

                        if (isReplyToDownloadMsg) {
                            const selectedQuality = parseInt(downloadMessageType.trim());
                            if (!isNaN(selectedQuality) && selectedQuality > 0 && selectedQuality <= dl_links.length) {
                                const selectedLink = dl_links[selectedQuality - 1];

                                const movieLinkResponse = await fetchJson(
                                    `https://apicine-api.vercel.app/api/cinesubz/download?url=${encodeURIComponent(
                                        selectedLink.link
                                    )}&apikey=test`
                                );

                                if (!movieLinkResponse.status || !movieLinkResponse.result.direct) {
                                    return await reply("*Error fetching the direct download link.*");
                                }

                                const downloadUrl = movieLinkResponse.result.direct;

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
                                );

                                await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
                            } else {
                                await reply("Give valid number.");
                            }
                        }
                    });
                } else {
                    await reply("Give valid number.");
                }
            }
        });
    } catch (e) {
        console.error("Error during CineSubz command execution:", e);
        reply("*An error occurred while processing your request.*");
    }
});
