(() => {
  const match = window.location.href.match(/\/(?:contest|problemset\/problem)\/(\d+)\/(?:problem\/)?([A-Z0-9]+)/i);
  if (!match) return;

  const problemKey = match[1] + match[2];

  async function getRating() {
    try {
      const { cfRatings, cfTime = 0 } = await chrome.storage.local.get(["cfRatings", "cfTime"]);
      const now = Date.now();
      
      let ratingsMap = cfRatings;
      let rating = ratingsMap ? ratingsMap[problemKey] : null;

      const isTooOld = now - cfTime > 86400000; // 24 hours
      const shouldCheckNew = !rating && now - cfTime > 43200000; // 1 hour

      if (!ratingsMap || isTooOld || shouldCheckNew) {
        try {
          const res = await fetch("https://codeforces.com/api/problemset.problems");
          if (res.ok) {
            const data = await res.json();
            ratingsMap = {};
            
            for (let i = 0; i < data.result.problems.length; i++) {
              const p = data.result.problems[i];
              if (p.rating) ratingsMap[p.contestId + p.index] = p.rating;
            }
            
            rating = ratingsMap[problemKey];
            
            chrome.storage.local.set({ cfRatings: ratingsMap, cfTime: now });
          }
        } catch (e) {} 
      }

      if (!rating) return;

      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.insertAdjacentHTML("beforeend", `
          <div class="roundbox sidebox">
            <div class="roundbox-lt">&nbsp;</div><div class="roundbox-rt">&nbsp;</div>
            <div class="caption titled">→ Problem rate</div>
            <div><div style="margin:1em;font-size:0.8em;">
              <div class="roundbox" style="margin:2px; padding:0 3px 2px 3px; background-color:#f0f0f0; width: 4rem">
                <div class="roundbox-lt">&nbsp;</div><div class="roundbox-rt">&nbsp;</div>
                <div class="roundbox-lb">&nbsp;</div><div class="roundbox-rb">&nbsp;</div>
                <span class="tag-box" style="font-size:1.2rem;" title="Difficulty">*${rating}</span>
              </div>
            </div></div>
          </div>`);
      }
    } catch (err) {}
  }

  getRating();
})();