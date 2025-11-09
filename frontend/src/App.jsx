import React, { useState } from "react";
import axios from "axios";

function App() {
  const [business, setBusiness] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const PORT = import.meta.env.VITE_API_URL
  console.log(PORT);
  

  const handleSearch = async (newSearch = true) => {
    if (!business || !city) {
      alert("Please enter both fields");
      return;
    }

    setLoading(true);
    try {
          const res = await axios.post(`${PORT}/api/search`, {
      business,
      city,
      page: newSearch ? 1 : page,
    });

      const data = res.data.data || [];

      if (newSearch) {
        setResults(data);
        setPage(2);
      } else {
        setResults((prev) => [...prev, ...data]);
        setPage((p) => p + 1);
      }

      setHasMore(data.length > 0);
    } catch (err) {
      console.error(err);
      alert("Error fetching data");
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!results.length) return;

    const headers = ["Name", "Address", "Phone", "Website", "Rating", "Total Ratings"];
    const csvRows = [
      headers.join(","),
      ...results.map((r) =>
        [
          `"${r.name}"`,
          `"${r.address}"`,
          `"${r.phone}"`,
          `"${r.website}"`,
          r.rating,
          r.total_ratings,
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business}_${city}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen from-gray-50 to-gray-100 p-6">
      <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-8 text-gray-800 tracking-tight">
        Google Maps Data Scraper
      </h1>

      {/* Search Card */}
      <div className="bg-white shadow-lg rounded-2xl p-6 max-w-4xl mx-auto mb-8 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <input
            type="text"
            placeholder="Business type (e.g. cafe, salon)"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 w-full md:w-1/3 outline-none transition-all"
          />
          <input
            type="text"
            placeholder="City or Pincode"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg p-3 w-full md:w-1/3 outline-none transition-all"
          />
          <button
            onClick={() => handleSearch(true)}
            className={`px-5 py-3 rounded-lg text-white font-semibold shadow transition-all duration-200 ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
            }`}
          >
            {loading ? "Searching..." : "🔍 Search"}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <button
            onClick={downloadCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-transform transform hover:scale-105"
          >
            ⬇️ Download CSV
          </button>

          {hasMore && !loading && (
            <button
              onClick={() => handleSearch(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-transform transform hover:scale-105"
            >
              🔁 Load More
            </button>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
        <table className="min-w-full border-collapse">
          <thead className="bg-blue-50 sticky top-0">
            <tr>
              {["Name", "Address", "Phone", "Website", "Rating", "Total Ratings"].map(
                (header) => (
                  <th
                    key={header}
                    className="border-b p-3 text-gray-700 font-semibold text-sm md:text-base"
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr
                key={i}
                className="text-center hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="border-b p-2">{r.name}</td>
                <td className="border-b p-2 text-gray-600">{r.address}</td>
                <td className="border-b p-2">{r.phone}</td>
                <td className="border-b p-2">
                  {r.website !== "N/A" ? (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      Visit
                    </a>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="border-b p-2">{r.rating}</td>
                <td className="border-b p-2">{r.total_ratings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8 text-lg">
          No data found. Try searching something.
        </p>
      )}
    </div>
  );
}

export default App;
