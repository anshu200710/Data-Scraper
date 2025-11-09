// backend/server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import { google } from "googleapis";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// --- GOOGLE SHEETS SETUP ---
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// --- Helper: Delay for next_page_token availability ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Main Route ---
app.post("/api/search", async (req, res) => {
  try {
    const { business, city, page = 1 } = req.body;

    if (!business || !city) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    console.log(`🔍 Searching: ${business} in ${city} (page ${page})`);

    // 1️⃣ Get city coordinates
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      city
    )}&key=${process.env.GOOGLE_API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results.length)
      return res.json({ success: true, data: [], message: "Invalid city" });

    const location = geoData.results[0].geometry.location;
    const lat = location.lat + (page - 1) * 0.05; // shift per page
    const lng = location.lng + (page - 1) * 0.05;

    const allPlaces = [];

    // 2️⃣ Get up to 60 results using next_page_token
    let nextPageToken = null;
    let fetchCount = 0;

    do {
      const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        business
      )}&location=${lat},${lng}&radius=5000&key=${process.env.GOOGLE_API_KEY}${
        nextPageToken ? `&pagetoken=${nextPageToken}` : ""
      }`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.results) {
        for (const p of data.results) {
          // 3️⃣ Get Place Details
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total&key=${process.env.GOOGLE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          const d = detailsData.result;

          allPlaces.push({
            name: d?.name || "N/A",
            address: d?.formatted_address || "N/A",
            phone: d?.formatted_phone_number || "N/A",
            website: d?.website || "N/A",
            rating: d?.rating || "N/A",
            total_ratings: d?.user_ratings_total || "N/A",
          });
        }
      }

      nextPageToken = data.next_page_token;
      fetchCount++;

      // Wait 2 sec before fetching next_page_token
      if (nextPageToken && fetchCount < 3) {
        await delay(2000);
      }
    } while (nextPageToken && fetchCount < 3);

    console.log(`✅ Found ${allPlaces.length} places on page ${page}`);

    // 4️⃣ Append to Google Sheet
    if (allPlaces.length > 0) {
      const sheetValues = allPlaces.map((p) => [
        p.name,
        p.address,
        p.phone,
        p.website,
        p.rating,
        p.total_ratings,
        new Date().toISOString(),
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Sheet1!A:G",
        valueInputOption: "RAW",
        requestBody: { values: sheetValues },
      });
      console.log("✅ Appended to Google Sheet");
    }

    res.json({ success: true, data: allPlaces });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/', (req,res) => {
  res.send("API IS WORKING")
})

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
