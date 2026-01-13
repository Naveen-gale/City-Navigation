// Replace with your OpenRouteService API key
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE0NWMwNmFjYmYzNTQ2NjU4ZjcxYjk3M2I5MWJmNWYzIiwiaCI6Im11cm11cjY0In0=";

let map = L.map('map').setView([20.5937, 78.9629], 5);

// Load map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let routeLayer;

// 🌆 Fetch city suggestions (autocomplete)
async function fetchSuggestions(query, elementId) {
  if (query.length < 3) {
    document.getElementById(elementId).innerHTML = "";
    return;
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
  const data = await res.json();

  const list = document.createElement("ul");
  data.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item.display_name;
    li.addEventListener("click", () => {
      document.getElementById(elementId.replace("-suggestions", "")).value = item.display_name;
      document.getElementById(elementId).innerHTML = "";
    });
    list.appendChild(li);
  });

  const suggestionBox = document.getElementById(elementId);
  suggestionBox.innerHTML = "";
  suggestionBox.appendChild(list);
}

// Get coordinates of a city
async function getCoordinates(city) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
  const data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } else {
    throw new Error(`City not found: ${city}`);
  }
}

// Listen for input typing (to show suggestions)
document.getElementById("start").addEventListener("input", e => fetchSuggestions(e.target.value, "start-suggestions"));
document.getElementById("end").addEventListener("input", e => fetchSuggestions(e.target.value, "end-suggestions"));

// Handle route button click
document.getElementById("routeBtn").addEventListener("click", async () => {
  const startCity = document.getElementById("start").value.trim();
  const endCity = document.getElementById("end").value.trim();

  if (!startCity || !endCity) {
    alert("Please enter both start and destination!");
    return;
  }

  try {
    const startCoords = await getCoordinates(startCity);
    const endCoords = await getCoordinates(endCity);

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${startCoords[1]},${startCoords[0]}&end=${endCoords[1]},${endCoords[0]}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features) {
      console.error(data);
      alert("Error fetching route! Check API key or request limit.");
      return;
    }

    // Remove old route
    if (routeLayer) map.removeLayer(routeLayer);

    // Draw new route
    const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    routeLayer = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    // Distance (m → km)
    const distance = (data.features[0].properties.summary.distance / 1000).toFixed(2);
    // Duration (s → hr:min)
    const totalSeconds = data.features[0].properties.summary.duration;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.round((totalSeconds % 3600) / 60);

    // Show info
    document.getElementById("output").innerHTML = `
      <b>From:</b> ${startCity} → <b>To:</b> ${endCity}<br>
      <b>Distance:</b> ${distance} km<br>
      <b>Duration:</b> ${hours} hr ${minutes} min
    `;
  } catch (err) {
    console.error(err);
    alert("Error fetching route: " + err.message);
  }
});
