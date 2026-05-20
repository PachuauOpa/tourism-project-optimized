const fs = require('fs');

const cssToAppend = `
/* ── Weather Card Widget ── */
.weather-card {
  background: #005baf;
  border-radius: 18px;
  padding: 20px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.weather-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.weather-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
}
.weather-desc {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.9;
}
.weather-temp-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.weather-temp {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}
.weather-feels {
  font-size: 13px;
  opacity: 0.8;
  font-weight: 600;
}
.weather-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.weather-pill {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.weather-pill-travel {
  background: #eafaf1;
  color: #0f6f41;
}

/* ── Explore Categories ── */
.explore-row {
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding-bottom: 12px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
}
.explore-row::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
.explore-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 72px;
  height: 72px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--ink);
}
.explore-card:hover {
  background: #eef4ff;
  border-color: #a8c8ff;
  transform: translateY(-2px);
}
.explore-card-highlight {
  background: linear-gradient(135deg, #eef4ff 0%, #e0ecfc 100%);
  border-color: #005baf;
}
.explore-emoji {
  font-size: 24px;
}
.explore-label {
  font-size: 11px;
  font-weight: 700;
}
`;

fs.appendFileSync('./src/index.css', cssToAppend);
console.log('Appended successfully');
